"use client";

import { useTranslations } from "next-intl";
import NextLink from "next/link";
import { ArrowRight, BookOpen, Bot, Box, Cpu, Layers, LifeBuoy, MessageSquare, ShieldCheck, WandSparkles } from "lucide-react";
import { Link } from "@/i18n/routing";
import { useAuth } from "@/lib/auth-context";
import { loginHrefForReturn } from "@/lib/safe-redirect";
import styles from "./PlatformOverview.module.css";

export function PlatformOverview() {
  const t = useTranslations("unifiedWorkspace");
  const w = useTranslations("workspace");
  const nav = useTranslations("nav");
  const groups = useTranslations("nav.groups");
  const footer = useTranslations("footer");
  const entry = useTranslations("chatEntry");
  const { isAuthenticated } = useAuth();
  const products = [
    { Icon: MessageSquare, title:w("chats"), description:t("chatDescription"), href:"/" },
    { Icon: Bot, title:w("agents"), description:t("agentsDescription"), href:isAuthenticated ? "/dashboard/agents" : loginHrefForReturn("/dashboard/agents") },
    { Icon: WandSparkles, title:w("canvas"), description:t("canvasDescription"), href:"/?mode=canvas" },
  ];
  const sections = [
    { title:t("exploreTitle"), items:[{Icon:Box,label:groups("featuresLabel"),description:groups("featuresSub"),href:"/features"},{Icon:Layers,label:groups("frameworksLabel"),description:groups("frameworksSub"),href:"/frameworks"},{Icon:Cpu,label:groups("computeLabel"),description:groups("computeSub"),href:"/compute"}] },
    { title:t("resources"), items:[{Icon:BookOpen,label:nav("docs"),href:"/docs"},{Icon:BookOpen,label:groups("tutorialsLabel"),href:"/tutorials"},{Icon:ShieldCheck,label:footer("itemSecurity"),href:"/security"},{Icon:LifeBuoy,label:nav("support"),href:"/support"}] },
  ];
  return <article className={styles.page} data-platform-overview>
    <header className={styles.heading}><h1>{t("platformTitle")}</h1><p>{t("platformDescription")}</p></header>
    <div className={styles.products}>{products.map(({Icon,title,description,href}) => <Link key={href} href={href} className={styles.product}><span className={styles.icon}><Icon size={27} strokeWidth={1.6}/></span><span><h2>{title}</h2><p>{description}</p></span><ArrowRight size={19}/></Link>)}</div>
    <div className={styles.sections}>{sections.map(section => <section key={section.title}><h2>{section.title}</h2>{section.items.map(({Icon,label,href,...item}) => <Link href={href} key={href} className={styles.resource}><Icon size={21} strokeWidth={1.6}/><span><strong>{label}</strong>{"description" in item && <small>{item.description}</small>}</span><ArrowRight size={16}/></Link>)}</section>)}</div>
    <footer className={styles.footer}><Link href="/">{entry("backToChat")}</Link><NextLink href="/privacy">{footer("itemPrivacy")}</NextLink><NextLink href="/terms">{footer("itemTerms")}</NextLink></footer>
  </article>;
}
