"""Isolated browser regression. All API calls are intercepted; sends no email."""
import json
import os
from pathlib import Path
from tempfile import gettempdir
from playwright.sync_api import sync_playwright, expect

BASE_URL = os.environ.get("REGISTRATION_TEST_URL", "http://127.0.0.1:3108")

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 390, "height": 844})
    state = {"conflict": True, "resends": [], "fail_resend": False}

    def api(route):
        path = route.request.url.split("3999", 1)[-1].split("?", 1)[0]
        status = 200
        result = {"success": True, "data": {}}
        if path == "/auth/check-availability":
            result["data"] = {"email": {"valid": True}, "username": {"valid": True}}
        elif path == "/auth/register":
            if state["conflict"]:
                status = 400
                result = {"success": False, "error": "This username is already taken. Choose another, or sign in / resend verification if this is your account."}
            else:
                result["data"] = {"registered": True, "requiresVerification": True, "message": "If this email can be registered, a verification email will be sent shortly."}
        elif path == "/auth/resend-verification":
            state["resends"].append(route.request.post_data_json)
            if state["fail_resend"]:
                status = 429
                result = {"success": False, "error": "Too many requests"}
            else:
                result["data"] = {"sent": True}
        elif path == "/auth/verify-email":
            status = 400
            result = {"success": False, "error": "Invalid or expired verification link"}
        elif path in ["/auth/me", "/auth/refresh"]:
            status = 401
            result = {"success": False, "error": "Unauthorized"}
        route.fulfill(status=status, content_type="application/json", body=json.dumps(result))

    page.route("http://127.0.0.1:3999/**", api)
    page.goto(f"{BASE_URL}/register")
    page.wait_for_load_state("networkidle")
    page.locator("#email").fill("fixture@example.test")
    page.locator("#username").fill("existinguser")
    page.locator("#password").fill("ExamplePass123!")
    page.locator("#confirmPassword").fill("ExamplePass123!")
    page.get_by_role("button", name="Create Account", exact=True).click()
    expect(page.get_by_role("alert").filter(has_text="username is already taken")).to_be_visible()
    assert page.url.endswith("/register")
    expect(page.get_by_role("link", name="Already signed up? Resend verification")).to_be_visible()

    state["conflict"] = False
    page.locator("#username").fill("differentuser")
    page.get_by_role("button", name="Create Account", exact=True).click()
    expect(page.get_by_role("heading", name="Check your email or recover access")).to_be_visible()
    expect(page.locator("body")).not_to_contain_text("We sent a verification link")
    expect(page.get_by_role("link", name="Sign in", exact=True)).to_be_visible()
    assert not state["resends"], "No automatic verification sends"
    page.get_by_label("Email used to sign up").fill("FIXTURE@EXAMPLE.TEST")
    page.get_by_role("button", name="Resend verification email").click()
    expect(page.locator('form [role="status"]')).to_contain_text("If this email belongs to an unverified account")
    assert state["resends"] == [{"email": "fixture@example.test"}]

    state["fail_resend"] = True
    page.get_by_role("button", name="Resend verification email").click()
    expect(page.get_by_role("alert").filter(has_text="Please wait a few minutes")).to_be_visible()
    expect(page.locator('form [role="status"]')).to_have_count(0)
    assert page.evaluate("document.documentElement.scrollWidth <= window.innerWidth")
    page.screenshot(path=str(Path(gettempdir()) / "registration-feedback-mobile.png"), full_page=True)

    page.goto("about:blank")
    page.goto(f"{BASE_URL}/verify-email#token={'a' * 64}")
    expect(page.get_by_role("heading", name="Verification Failed")).to_be_visible()
    expect(page.get_by_role("button", name="Resend verification email")).to_be_visible()
    assert "token=" not in page.url

    page.goto(f"{BASE_URL}/ro/verify-email")
    expect(page.get_by_role("heading", name="Verifică emailul sau recuperează accesul")).to_be_visible()
    page.set_viewport_size({"width": 1440, "height": 1000})
    page.goto(f"{BASE_URL}/de/verify-email")
    expect(page.get_by_role("heading", name="Check your email or recover access")).to_be_visible()
    page.screenshot(path=str(Path(gettempdir()) / "registration-feedback-desktop.png"), full_page=True)
    browser.close()
    print("PASS: duplicate username, accepted request, explicit resend, normalized email, rate-limit error, expired link recovery, mobile layout, RO and DE fallback; no external writes")
