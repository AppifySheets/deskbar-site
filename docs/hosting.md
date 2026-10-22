# Hosting

deskbar.app is served by GitHub Pages from this repository. The domain is registered at
Namecheap, its nameservers point at Cloudflare, and Cloudflare holds the DNS records that
send it to GitHub. Cloudflare is DNS only here: it does not proxy or serve the site.

## How a change goes live

1. A pull request runs `check.yml` (html-validate and lychee). main requires both.
2. Merging it pushes to main, which runs `pages.yml`. That uploads `site/` as the Pages
   artifact and deploys it. The run page shows the live URL when it is done.
3. To redeploy without a commit, run "Publish site" from the Actions tab.

Only `site/` is published. The README, this file, the workflows and the checker configs are
never served.

## Repository settings (Settings, Pages)

| Setting | Value |
|---|---|
| Build and deployment, Source | GitHub Actions |
| Custom domain | `deskbar.app` |
| Enforce HTTPS | on, once GitHub has issued the certificate (up to 24 hours after DNS works) |

The custom domain is a repository setting. A `CNAME` file in `site/` would do nothing,
because Actions-based deploys ignore it.

The `github-pages` environment accepts deploys from the default branch only, so a workflow
run on another branch cannot publish.

## DNS at Cloudflare

In the deskbar.app zone, with every record set to DNS only (grey cloud, not proxied).
A proxied record hides the domain from GitHub, so GitHub cannot check it or issue the
certificate:

| Type | Name | Content |
|---|---|---|
| A | `deskbar.app` | `185.199.108.153` |
| A | `deskbar.app` | `185.199.109.153` |
| A | `deskbar.app` | `185.199.110.153` |
| A | `deskbar.app` | `185.199.111.153` |
| AAAA | `deskbar.app` | `2606:50c0:8000::153` |
| AAAA | `deskbar.app` | `2606:50c0:8001::153` |
| AAAA | `deskbar.app` | `2606:50c0:8002::153` |
| AAAA | `deskbar.app` | `2606:50c0:8003::153` |
| CNAME | `www` | `appifysheets.github.io` |

With both the apex and `www` in place and the custom domain set to the apex, GitHub
redirects `www.deskbar.app` to `deskbar.app` on its own. No redirect rule is needed.

The `www` target is the organisation's address without the repository name. Source:
[Managing a custom domain for your GitHub Pages site](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site).

## Domain verification

GitHub recommends verifying the domain for the AppifySheets organisation, so that no other
GitHub account can point a Pages site at deskbar.app or a subdomain of it. In the
organisation's Settings, Pages, "Add a domain" shows a TXT record to create at Cloudflare
(name `_github-pages-challenge-appifysheets`, value given there), then Verify. Never add a
wildcard record such as `*.deskbar.app`; GitHub warns that it allows takeovers even with
verification.

## Response headers

GitHub Pages sets its own response headers, and a repository cannot change them. So:

- The Content-Security-Policy and the referrer policy are meta tags in each page's head.
  They allow only the site's own images and stylesheets: no scripts, fonts, frames, forms
  or connections.
- Framing cannot be blocked: `frame-ancestors` is ignored in a meta tag, and
  `X-Frame-Options` only works as a header. The pages have nothing to click that acts on a
  visitor's behalf, so this costs little.
- HSTS and the other headers are whatever GitHub Pages sends.

If those headers ever matter, put Cloudflare's proxy in front (orange cloud on the records,
SSL/TLS mode Full (strict), response header Transform Rules). The proxy only works once
GitHub has issued its certificate, so do it after HTTPS is enforced. Also keep these zone
features off, because they inject scripts or set cookies, which would make the privacy page
untrue: Email Address Obfuscation, Rocket Loader, Web Analytics, Bot Fight Mode and Zaraz.

## Short links and the 404 page

GitHub Pages has no redirect rules, so each short link is a folder in `site/` with an
`index.html` that forwards the browser by meta refresh (no script) and shows a plain link
meanwhile:

| Link | Goes to |
|---|---|
| `/download` | the latest release on GitHub |
| `/source` | the Deskbar repository |
| `/eula`, `/terms-of-service` | `/terms` |
| `/refund` | `/refunds` |

`404.html` at the top of `site/` is served, with status 404, for any path that does not
exist. GitHub Pages serves `privacy.html` at `/privacy`, so the pages link to each other
without the extension.

## Checking it after a change

```powershell
curl.exe -sI https://deskbar.app/              # 200
curl.exe -sI https://www.deskbar.app/privacy   # 301 to https://deskbar.app/privacy
curl.exe -sI https://deskbar.app/privacy       # 200
curl.exe -sI https://deskbar.app/nope          # 404
```

None of them should carry a `set-cookie` header.
