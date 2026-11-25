# The site's smoke suite as an image, for the Job that runs after every production deploy (deploy/smoke): Playwright
# with Chromium, tests and config. Built by ../.github/workflows/release.yml next to the site, same tag (the release version).
FROM mcr.microsoft.com/playwright:v1.64.0-noble
# The commit the suite was built from; 01-home checks that the site reports the same in /api/health.
ARG REVISION=unknown
WORKDIR /e2e
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY playwright.config.ts ./
COPY tests ./tests
COPY run-in-cluster.sh ./
ENV HOME=/tmp E2E_OUTPUT_DIR=/tmp/results E2E_REVISION=$REVISION
USER pwuser
CMD ["/e2e/run-in-cluster.sh"]
