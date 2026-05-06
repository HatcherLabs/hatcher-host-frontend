import { NextResponse } from 'next/server';

export const dynamic = 'force-static';
export const revalidate = 3600;

const assetLinks = [
  {
    relation: [
      'delegate_permission/common.handle_all_urls',
      'delegate_permission/common.get_login_creds',
    ],
    target: {
      namespace: 'android_app',
      package_name: 'host.hatcher.app',
      sha256_cert_fingerprints: [
        'DD:FE:E2:35:F5:B1:EF:C0:99:0E:21:BB:CF:60:B9:D5:E7:BC:0B:67:83:26:37:39:5C:9A:AC:83:9D:09:D0:5A',
      ],
    },
  },
];

export function GET() {
  return NextResponse.json(assetLinks, {
    headers: {
      'cache-control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  });
}
