# GOAT WARS
## COMPLETE PRODUCT REQUIREMENTS AND IMPLEMENTATION SPECIFICATION

Act as a senior full-stack developer, product designer, football community platform architect, database engineer, payment integration specialist, and security engineer.

Build a complete, production-oriented football debate and fan voting platform named **GOAT Wars**.

Do not stop at a plan, UI mockup, static landing page, or collection of disconnected components. Inspect the existing repository, implement the actual application, test it, and document how to deploy it.

The final product must look premium, work on mobile and desktop, support secure payments, display accurate results, and encourage visitors to share their football opinions.

---

# 1. PRODUCT OVERVIEW

## Product name
GOAT Wars

## Primary tagline
ONE DEBATE. TWO LEGENDS. YOUR VOTE.

## Viral sharing slogan
I'VE VOTED FOR MY GOAT. VOTE FOR YOURS!

## Product concept

GOAT Wars is a football debate platform where supporters compare players, football clubs, managers, and title predictions.

Visitors can explore debates, select their preferred candidate, participate according to each debate's rules, view aggregate results, and share their opinions through personalized downloadable fan cards.

The flagship debate is:

**Lionel Messi vs Cristiano Ronaldo**

The homepage must also feature these Premier League debates directly underneath the flagship matchup:

1. Cole Palmer vs Bruno Fernandes.
2. Best Premier League club.
3. Who will win the Premier League?
4. Best Premier League manager.

Build the architecture to support additional debates in the future.

## Initial market

Kenya first, with international expansion supported by the architecture.

## Initial currency

KES for Kenyan payments.

## Authentication

Public visitors must not need to register or log in to browse debates, select a favourite, or share public results.

Administrative functions must require secure authentication.

## Business model

The platform can support:
- Free participation in designated debates.
- Paid voting where enabled.
- Optional premium fan-card designs.
- Optional profile customizations in a future release.

Do not make every interaction paid. Free browsing, sharing, viewing results, and generating basic fan cards should remain available.

Do not introduce subscriptions, complicated virtual currencies, gambling, or unnecessary monetization systems in the initial build.

---

# 2. MANDATORY TECHNOLOGY STACK

Use the following architecture.

## Frontend hosting
Cloudflare Pages.

## Frontend technologies
- HTML5.
- CSS3.
- Vanilla JavaScript.
- Browser Canvas API for downloadable fan cards where appropriate.

Do not introduce React, Next.js, or another frontend framework unless the existing repository already depends on one and replacing it would be unnecessarily disruptive.

Prefer straightforward, maintainable HTML, CSS, and JavaScript.

## Backend
Cloudflare Workers.

Use Workers for secure payment initialization, payment verification, webhook handling, vote accounting, and privileged administrative operations.

## Database
Supabase PostgreSQL.

Use Supabase for persistent matchup data, candidates, payments, vote records, and administrative records.

## Payments
Paystack.

Integrate using the official documented payment flow supported by the configured merchant account and payment methods.

## Version control and deployment
GitHub repository connected to Cloudflare Pages for continuous deployment.

## Architecture requirements

The architecture must distinguish between public frontend code and trusted server-side operations.

Never expose the following in browser code:
- Paystack secret keys.
- Supabase service-role keys.
- Administrative credentials.
- Private database connection strings.
- Other server secrets.

The browser may use approved public configuration, such as a Supabase publishable or anonymous key where needed, provided database access is protected by appropriate Row Level Security policies.

Cloudflare Pages should serve the public application. Route secure API operations through Cloudflare Workers using a clearly documented API base URL or an appropriate Pages Functions integration.

Do not assume that a standalone Cloudflare Pages static deployment can execute a separate Worker's server-side code automatically. Configure routing and deployment explicitly.

Prefer same-origin API routes where practical. If using a separate Worker hostname, configure CORS securely and document the production origin.

---

# 3. DESIGN AND BRAND DIRECTION

Build a premium, cinematic football website.

The design must feel like a serious football media brand combined with an interactive fan rivalry experience.

Avoid generic SaaS dashboard styling.

## Colour palette

- Main background: #080A09.
- Secondary background: #111512.
- Primary accent: #39E477.
- Primary text: #F6F8F6.
- Secondary text: #A4AEA7.
- Borders: #29312B.
- Error and warning colours with accessible contrast.

Use green selectively for voting actions, selected states, positive confirmation, and active indicators.

## Typography

Use:
- Space Grotesk or a similar display typeface for large headlines.
- Inter or a similar readable sans-serif for body text.

Use sensible fallbacks if external fonts cannot load.

## Visual language

Use:
- Dark stadium environments.
- Authentic football photography.
- Strong typography.
- Clean alignment.
- Spacious layouts.
- Subtle shadows.
- Restrained lighting effects.
- Clear voting controls.
- Smooth but restrained transitions.

Do not cover player faces with headings or buttons.

Do not use excessive gradients, random decorative elements, or animations that interfere with usability.

Respect the user's reduced-motion preference.

## Responsive behavior

The website must work on:
- Android phones.
- iPhones.
- Tablets.
- Laptops.
- Desktop screens.

Design mobile-first.

Avoid horizontal scrolling, overlapping text, oversized navigation, and buttons too small to tap comfortably.

---

# 4. REAL FOOTBALL PHOTOGRAPHY

Use authentic, recognizable photographs of Lionel Messi, Cristiano Ronaldo, Cole Palmer, Bruno Fernandes, football clubs, and managers where appropriate.

## Image requirements

- Use sources that permit the intended commercial and promotional use.
- Record image source and licensing information.
- Store suitable assets in the project or another appropriate image-hosting location where the applicable licence allows.
- Optimize image dimensions and formats.
- Use responsive image variants where practical.
- Provide alt text.
- Use suitable object positioning for different screen sizes.

Do not generate artificial player faces and present them as genuine photographs.

Do not hotlink random images without checking usage rights.

Do not assume that photographs are commercially reusable simply because they appear in search results.

If permissioned photographs are not yet available, implement replaceable image assets and clearly document which assets the owner must supply.

Do not invent official player endorsements or imply that GOAT Wars is affiliated with FIFA, the Premier League, clubs, players, or managers.

---

# 5. HOMEPAGE STRUCTURE

The homepage must follow this order.

1. Header.
2. Messi vs Ronaldo flagship matchup.
3. Flagship live results.
4. Football Debate Arena.
5. How It Works.
6. Fan Cards and Sharing.
7. Optional featured debates.
8. Footer.

The four Premier League debate experiences must appear immediately below the Messi vs Ronaldo matchup and its results.

---

# 6. HEADER AND NAVIGATION

Build a compact header featuring:

- GOAT WARS wordmark.
- Home.
- Debates.
- Results.
- How It Works.
- A responsive mobile menu.

Add an appropriate live indicator when a matchup is actively accepting votes.

The header must be keyboard-accessible and must work without JavaScript-dependent navigation failures where practical.

Do not add unnecessary navigation items.

---

# 7. FLAGSHIP MATCHUP: MESSI VS RONALDO

This is the primary visual focus of the homepage.

## Hero content

Headline:

THE GREATEST OF ALL TIME?

Supporting text:

Two legends. Millions of opinions. Choose your GOAT and join the battle.

Display:
- Lionel Messi.
- Cristiano Ronaldo.
- Authentic, permissioned photographs.
- A dark stadium background.
- Current verified aggregate totals.
- Current percentages.
- Voting price or free-voting label according to configuration.
- Clear voting buttons.

Make the matchup visually dramatic while preserving clarity.

## Player selection

Visitors can select Messi or Ronaldo.

After selection, open a purchase or participation panel appropriate to the matchup configuration.

The panel must show:
- Selected player.
- Voting rules.
- Price per vote if paid.
- Quantity selector if multiple votes are supported.
- Total payable amount.
- Payment or confirmation action.
- Applicable terms.

Do not collect unnecessary personal information.

## Vote quantity

For paid voting, quantity must be a positive integer within an administrator-configured limit.

The backend must calculate the total.

Never trust the browser to provide the authoritative price.

## Results

Display:
- Messi's verified votes.
- Ronaldo's verified votes.
- Total verified votes.
- Percentage share.
- A comparison bar.
- Last-updated time.

When there are no votes, display a proper empty state.

Do not use invented initial totals.

Only display live results when connected to actual data.

---

# 8. THE FOOTBALL DEBATE ARENA

Place this section directly beneath the flagship matchup and its results.

## Section introduction

Eyebrow:

THE DEBATE DOESN'T END HERE

Heading:

THE FOOTBALL DEBATE ARENA

Description:

From the best players to the biggest clubs, make your voice heard. Pick your side, join the debate, and see what football fans think.

Include category filters:
- All Debates.
- Players.
- Clubs.
- Title Predictions.
- Managers.

Filtering should work without a full-page reload.

Use real data from the backend where available. Do not fabricate vote counts.

## Debate card design

Each debate should have:
- Category.
- Headline.
- Relevant image or candidate portraits.
- Candidate names.
- Voting status.
- Verified aggregate results if voting is enabled.
- A clear View Debate or Vote action.
- Share functionality.

Use editorial-style layouts rather than making every item an oversized, identical dashboard card.

Keep the design consistent with GOAT Wars branding.

---

# 9. DEBATE 01: COLE PALMER VS BRUNO FERNANDES

Category:

PLAYER BATTLE

Question:

WHO'S THE BETTER PLAYER?

Candidates:
- Cole Palmer.
- Bruno Fernandes.

Supporting text:

Two creative talents. Two different styles. Who would you pick?

Provide:
- Candidate portraits.
- Candidate names.
- Optional team affiliation based on verified current information.
- Vote action.
- Results.
- Share action.

Allow administrators to update player information and images.

Do not hardcode outdated club affiliations or claim that one player is definitively better.

Present the debate as a fan opinion poll.

---

# 10. DEBATE 02: BEST PREMIER LEAGUE CLUB

Category:

CLUB WARS

Question:

WHICH CLUB IS THE BEST?

Create a multi-candidate debate.

Initial suggested candidates:
- Manchester City.
- Arsenal.
- Liverpool.
- Chelsea.

Allow authorized administrators to add or remove candidates.

Display:
- Club identity.
- Club name.
- Appropriate permitted image.
- Verified aggregate votes.
- Percentage share.
- Vote action.

The debate must support more than two candidates.

Do not assume the team with the highest fan-poll votes is necessarily the most successful club.

Allow administrators to define the debate criteria, such as:
- Best club overall.
- Best club this season.
- Best attacking team.
- Best defensive team.
- Best supporters.

Each poll should have a clear question so voters know what they are evaluating.

---

# 11. DEBATE 03: PREMIER LEAGUE TITLE PREDICTION

Category:

TITLE RACE

Question:

WHO WILL WIN THE PREMIER LEAGUE?

Create a season-specific prediction poll.

Candidates should reflect the teams eligible for the selected season.

Allow authorized administrators to:
- Select the season.
- Configure eligible teams.
- Set the voting deadline.
- Open or close predictions.
- Configure whether users may revise their selection before the deadline.
- Mark the competition as completed.

Clearly distinguish predictions from actual standings and final results.

A fan prediction is not an official league outcome.

Do not automatically award money, prizes, or rewards for correct predictions.

If future prize-based competitions are considered, require a separate legal and product review before implementation.

---

# 12. DEBATE 04: BEST PREMIER LEAGUE MANAGER

Category:

MANAGER WARS

Question:

WHO'S THE BEST MANAGER?

Candidates should be administrator-managed and reflect the relevant season.

Initial suggested candidates:
- Pep Guardiola.
- Mikel Arteta.
- Other verified current Premier League managers.

Display:
- Manager portrait.
- Name.
- Current team affiliation where verified.
- Verified vote count.
- Percentage share.
- Vote action.

Supporting text:

Tactical genius, trophies, leadership, and results. Who gets your vote?

Allow administrators to update candidates when managers change clubs or leave the league.

Do not imply that every suggested manager currently manages the same club as in an older season.

---

# 13. DEBATE DETAIL PAGES

Every debate must have a unique identifier and public slug.

Examples of slug patterns:
- messi-vs-ronaldo.
- palmer-vs-bruno.
- best-premier-league-club.
- premier-league-title-prediction.
- best-premier-league-manager.

These are suggested slugs, not domain names.

Each detail page should display:
- Debate title.
- Description.
- Candidates.
- Rules.
- Voting status.
- Start and end dates where applicable.
- Voting price or free label.
- Verified results.
- Sharing options.
- Related debates.

Do not require a new frontend codebase for every debate.

Use reusable components and backend-managed debate data.

---

# 14. VOTING SYSTEM

The platform must support different participation rules for different debates.

## Free polls

For designated free polls:
- Visitors select a candidate.
- The server validates the selection.
- The vote is recorded according to the poll's configured rules.
- Results update after the backend confirms the vote.

Add reasonable abuse protection.

If strict one-vote-per-person enforcement is required, design an appropriate verification mechanism. Do not claim that an anonymous browser identifier proves a unique human identity.

## Paid polls

For paid polls:
- The server calculates the price.
- A valid payment is initialized.
- The provider processes the payment.
- The backend verifies the transaction.
- The purchased quantity is credited exactly once.
- The public results are updated.

For paid polls, clearly state that multiple votes may be purchased where enabled.

## Voting states

Every debate should support:
- Upcoming.
- Open.
- Paused.
- Closed.
- Archived.

Enforce voting status on the backend.

Hiding a button in the frontend is not sufficient to prevent votes after a poll closes.

## No fake engagement

Never create:
- Random vote totals.
- Fake participants.
- Fabricated testimonials.
- Fake live activity.
- Artificial payment success messages.

---

# 15. PAYSTACK PAYMENT INTEGRATION

Use Paystack for supported payments.

Before launch, verify that the actual merchant account and payment channel support the configured transaction amount, currency, and transaction type.

The proposed starting price is KES 10 per vote, but the implementation must not assume that every payment method supports that amount.

If KES 10 is below the applicable minimum transaction amount:
1. Report the limitation.
2. Identify supported options.
3. Ask the owner to approve any pricing change.
4. Keep the site from charging an unapproved amount.

## Checkout process

1. Visitor chooses a candidate.
2. Visitor selects quantity if applicable.
3. Frontend submits the selection to the backend.
4. Backend validates the debate and candidate.
5. Backend calculates the total.
6. Backend creates a unique payment reference.
7. Backend stores a pending transaction.
8. Backend initializes Paystack checkout.
9. Visitor completes or cancels payment.
10. Paystack sends a webhook and/or the visitor returns.
11. Backend independently verifies the transaction.
12. Backend credits the correct number of votes exactly once.
13. Frontend retrieves confirmed status and updated results.

## Payment security

- Use server-side payment initialization.
- Store secrets in Cloudflare Worker secrets or another appropriate secret manager.
- Validate webhook signatures using the documented Paystack algorithm.
- Verify status, reference, amount, currency, candidate, and quantity.
- Reject duplicate or mismatched transactions.
- Prevent replayed webhooks from crediting votes twice.
- Use atomic database transactions.
- Never treat a redirect as proof of payment.
- Never store card details or mobile money PINs.
- Keep payment records private.

## Payment status

Support:
- Pending.
- Successful.
- Failed.
- Cancelled or abandoned where applicable.
- Reconciliation required.

Build a real payment-return page.

A successful confirmation must appear only after trusted backend verification.

Refreshing a return page must never create another vote credit.

---

# 16. LIVE RESULTS

Build a reusable results system for all debates.

Display:
- Candidate totals.
- Aggregate total.
- Percentage shares.
- Comparison visualizations.
- Last-updated timestamp.

Support multi-candidate polls.

Results must be calculated from verified database records or another reliable server-controlled aggregation.

Use polling or another practical update mechanism.

Do not expose private payment records through the results API.

When a poll has no votes, render a neutral empty state.

---

# 17. DOWNLOADABLE FAN CARDS

Fan cards are a core growth feature.

The website must generate real downloadable images, not static mockups or screenshots of the page.

## Main slogan

I'VE VOTED FOR MY GOAT. VOTE FOR YOURS!

## Messi card

Display:
- GOAT WARS branding.
- Messi's permitted photograph.
- MY GOAT: LIONEL MESSI.
- The main slogan.
- YOUR GOAT. YOUR VOTE.
- Configured public website URL.

## Ronaldo card

Display:
- GOAT WARS branding.
- Ronaldo's permitted photograph.
- MY GOAT: CRISTIANO RONALDO.
- The main slogan.
- YOUR GOAT. YOUR VOTE.
- Configured public website URL.

## Other candidates

Allow fan cards for Premier League players, clubs, and managers where the image rights and design configuration permit.

Use the candidate's name and relevant debate title.

## Truthfulness

If the visitor has not completed a verified vote, use:
- MY GOAT IS…
- I'M BACKING…
- MY PICK IS…

Only display “I'VE VOTED FOR MY GOAT” when the visitor has a corresponding verified vote.

## Formats

Generate:
- 1080 × 1920 vertical PNG.
- 1080 × 1080 square PNG.

Provide:
- Preview Card.
- Download Vertical Card.
- Download Square Card.
- Share on WhatsApp.

## Design

Use:
- Cinematic dark stadium imagery.
- Large, readable headlines.
- Clear candidate imagery.
- Restrained green accents.
- Consistent GOAT WARS branding.
- Proper margins for platform cropping.
- High contrast.

Handle image loading and canvas cross-origin limitations correctly.

---

# 18. WHATSAPP AND SOCIAL SHARING

Implement WhatsApp sharing with a prefilled message such as:

“I've backed my GOAT! 🐐🔥 Now it's your turn. Pick your side at [CONFIGURED_PUBLIC_URL]”

Generate the actual share URL using the configured canonical public URL.

Provide:
- Share matchup.
- Share selected candidate.
- Share results.
- Copy link.
- Download fan card.
- Native mobile sharing where supported.

Do not claim that a website can silently post an image to someone's WhatsApp account.

Allow visitors to download the card and attach it manually, or use a supported native sharing interface.

Do not invent the production domain.

Configure the canonical public URL once and reuse it throughout the application.

---

# 19. PREMIUM FEATURES

Keep the initial release simple.

Basic features should include:
- Browse debates.
- View public results.
- Participate in designated free polls.
- Share debates.
- Download basic fan cards.

Optional future premium features may include:
- Special fan-card themes.
- Animated profile decorations.
- Exclusive visual badges.
- Additional personalization.

Do not require users to purchase premium features to see public results or share basic fan cards.

If premium purchases are implemented:
- Show prices clearly.
- Explain exactly what is included.
- Verify payment on the backend.
- Deliver the purchased feature only after successful verification.
- Avoid fake scarcity and misleading promises.

Do not build complicated subscriptions or virtual currencies without a demonstrated need.

---

# 20. ADMINISTRATION DASHBOARD

Build a protected administrative area.

## Dashboard overview

Display:
- Total verified votes.
- Active debates.
- Closed debates.
- Verified payment totals.
- Pending payments.
- Failed payments.
- Recent operational events.

Do not confuse gross payment volume with profit.

Show financial figures only when based on actual payment records.

## Debate management

Administrators can:
- Create debates.
- Edit titles and descriptions.
- Add and remove candidates.
- Upload or configure permitted images.
- Set category and slug.
- Configure participation rules.
- Set prices.
- Set voting deadlines.
- Open, pause, close, and archive debates.

## Candidate management

Administrators can:
- Add players, clubs, and managers.
- Edit names and descriptions.
- Update images and attribution.
- Update team affiliations.
- Control which candidates appear in each debate.

## Payment management

Administrators can:
- Review payment statuses.
- Reconcile provider transactions.
- Identify mismatches.
- Export appropriate reports.

Do not expose private payment information to unauthorized users.

## Security

- Enforce authorization on the backend.
- Use secure administrator authentication.
- Do not hardcode credentials.
- Maintain audit logs for sensitive operations.
- Do not rely on frontend-only access restrictions.

---

# 21. DATABASE DESIGN

Use Supabase PostgreSQL.

Create migration files and document their execution.

Suggested tables:

## `matchups`
Stores debate titles, descriptions, slugs, category, status, voting rules, pricing, scheduling, and public visibility.

## `candidates`
Stores player, club, and manager identities, descriptions, and permitted image references.

## `matchup_candidates`
Connects candidates to debates and stores debate-specific configuration.

## `payments`
Stores payment references, provider references, amount, currency, quantity, selected candidate, matchup, status, and timestamps.

## `vote_credits`
Stores the verified vote credit associated with a successfully processed payment.

## `free_votes`
Stores free-poll votes where enabled, with appropriate abuse controls and privacy safeguards.

## `admin_audit_logs`
Stores authorized administrative changes.

Additional tables may be introduced when justified.

## Database rules

- Use primary and foreign keys.
- Add appropriate unique constraints.
- Index common lookup and aggregation fields.
- Enforce valid statuses and quantities.
- Prevent duplicate payment crediting.
- Ensure vote credits are associated with the correct candidate and matchup.
- Use atomic transactions.
- Restrict privileged operations.
- Implement Row Level Security.
- Do not allow anonymous users to directly write verified vote credits.

Keep the schema practical and avoid unnecessary complexity.

---

# 22. CLOUDFLARE PAGES DEPLOYMENT

The frontend must be deployable through Cloudflare Pages.

## Repository structure

Use a clear structure similar to:

- `index.html`
- `styles.css`
- `app.js`
- `assets/`
- `pages/`
- `privacy.html`
- `terms.html`
- `about.html`
- `contact.html`
- `admin/`
- `functions/` if Pages Functions are used
- `worker/` if the API is a separately deployed Worker
- `supabase/migrations/`
- `tests/`
- `README.md`
- `.gitignore`

Adapt the structure to the existing repository rather than duplicating files or breaking working functionality.

## Deployment requirements

Document:
1. How to connect the GitHub repository to Cloudflare Pages.
2. The build configuration for the chosen frontend architecture.
3. How to deploy the API Worker.
4. How to configure environment variables and secrets.
5. How to connect Supabase.
6. How to configure Paystack.
7. How to set the public canonical URL.
8. How to configure any custom domain.
9. How to test preview deployments.
10. How to launch production safely.

For a static HTML/CSS/JavaScript frontend, use the appropriate static output directory and avoid unnecessary build tooling.

If Pages Functions are used, explain how they access bindings and environment variables.

If a separate Worker is used, document the API hostname or route and configure CORS only for the necessary origins.

Do not assume that deployment of the static Pages site automatically deploys a separate Worker.

---

# 23. ENVIRONMENT VARIABLES AND SECRETS

Document required configuration, including the equivalent of:

- `PUBLIC_SITE_URL`
- `API_BASE_URL` if the API is separate.
- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY` or the appropriate public client key if required.
- `SUPABASE_SERVICE_ROLE_KEY` for trusted server-side use only.
- `PAYSTACK_SECRET_KEY`
- `PAYSTACK_PUBLIC_KEY` if required by the chosen frontend checkout flow.
- `PAYSTACK_WEBHOOK_SECRET` only if applicable to the documented integration.
- Other required operational settings.

Use the correct names and mechanisms for Cloudflare bindings and secrets in the final implementation.

Never put service-role keys or Paystack secret keys into public frontend environment variables.

Do not commit actual secret values.

Keep local development, preview, sandbox, and production settings separate.

---

# 24. PRIVACY AND LEGAL PAGES

Create readable:
- Privacy Policy.
- Terms and Conditions.
- About.
- Contact and Support.

Explain:
- How voting works.
- Which debates are free and which are paid.
- How payments are processed.
- What information is collected.
- How aggregate results are calculated.
- How long records are retained.
- How visitors can request support.
- How cancelled or failed payments are handled.
- How images and third-party marks are used.

Do not present GOAT Wars as officially affiliated with the Premier League, FIFA, football clubs, players, or managers unless authorization exists.

Review applicable Kenyan privacy, consumer-protection, tax, and payment requirements before launching.

---

# 25. SECURITY REQUIREMENTS

Implement:
- Strict input validation.
- Backend-controlled prices.
- Secure payment verification.
- Webhook signature verification.
- Idempotent payment processing.
- Atomic vote crediting.
- Appropriate rate limiting.
- Safe error responses.
- Restricted database access.
- Proper secret management.
- Protected administration.
- Appropriate logging.
- Abuse prevention.

Never trust client-provided vote totals, payment status, or final payment amounts.

Never expose private payment records through public APIs.

Do not make absolute promises that anonymous users can be perfectly identified.

---

# 26. TESTING

Test the actual implementation.

## Frontend tests
- Homepage rendering.
- Mobile layout.
- Desktop layout.
- Category filters.
- Candidate selection.
- Debate detail navigation.
- Empty states.
- Error states.
- Fan-card previews.
- PNG downloads.
- WhatsApp sharing.

## Voting tests
- Messi selection.
- Ronaldo selection.
- Palmer selection.
- Bruno selection.
- Multi-candidate poll voting.
- Free-poll behavior.
- Closed debate behavior.
- Invalid candidate rejection.
- Invalid quantity rejection.
- Correct result calculations.

## Payment tests
- Successful verification.
- Failed payment.
- Cancelled payment.
- Pending payment.
- Incorrect amount.
- Incorrect currency.
- Duplicate webhook.
- Invalid signature.
- Duplicate reference.
- Database failure.
- Repeated return-page refresh.

## Security tests
- Public users cannot credit votes directly.
- Public users cannot modify prices.
- Public users cannot access administration.
- Private payment information is not publicly readable.
- Duplicate notifications cannot credit votes twice.
- Secrets do not appear in the frontend bundle or repository.

Use sandbox transactions for testing.

Never charge real customers during automated tests.

---

# 27. PERFORMANCE AND ACCESSIBILITY

Optimize for real-world mobile connections.

Requirements:
- Fast initial page load.
- Compressed images.
- Responsive image dimensions.
- Lazy loading for non-critical images.
- Minimal JavaScript.
- Semantic HTML.
- Accessible form labels.
- Keyboard support.
- Visible focus states.
- Appropriate contrast.
- Reduced-motion support.
- Responsive navigation.
- No broken layouts on narrow screens.

---

# 28. SEO AND SOCIAL PREVIEWS

Implement:
- Page titles.
- Meta descriptions.
- Canonical URLs.
- Open Graph metadata.
- Social preview images.
- Favicon.
- Sitemap where appropriate.
- Robots.txt where appropriate.

Each public debate should have appropriate title and description metadata.

Use the configured public domain rather than an assumed domain.

Ensure social previews do not use unauthorized images or misleading endorsements.

---

# 29. IMPLEMENTATION WORKFLOW

Follow this workflow.

### Step 1: Audit
Inspect the current repository.

Identify:
- Existing frontend files.
- Existing backend code.
- Database schema.
- Payment integration.
- Current deployment configuration.
- Broken or incomplete functionality.
- Security concerns.

### Step 2: Plan
Write a concise implementation checklist based on the actual repository.

### Step 3: Implement the homepage
Build the full responsive design and all five initial debate experiences.

### Step 4: Implement the database
Create migration files and secure database policies.

### Step 5: Implement the backend
Create or improve API routes, payment processing, vote accounting, and results retrieval.

### Step 6: Implement fan cards
Build working PNG generation, downloads, and sharing.

### Step 7: Implement administration
Create secure matchup and candidate management.

### Step 8: Test
Run available automated tests and perform responsive and functional checks.

### Step 9: Document
Write deployment and configuration instructions.

### Step 10: Report
Summarize exactly what is implemented, what passed testing, what requires credentials, and what remains incomplete.

Do not stop after creating the plan. Make the actual changes.

Do not claim a test passed unless it was run.

Do not claim a deployment succeeded unless it was verified.

---

# 30. FINAL ACCEPTANCE CRITERIA

The initial release is complete when:

1. The frontend deploys successfully through Cloudflare Pages.
2. The backend operates through a correctly configured Worker or Pages Functions architecture.
3. Supabase stores persistent debate and vote data.
4. Messi vs Ronaldo is the flagship matchup.
5. Palmer vs Bruno appears directly below the flagship results as part of the Football Debate Arena.
6. Best Premier League Club is available.
7. Premier League Title Prediction is available.
8. Best Premier League Manager is available.
9. The system supports additional debates without rewriting the application.
10. Public visitors can participate without creating accounts.
11. Paid votes are credited only after trusted payment verification.
12. Free polls follow their configured voting rules.
13. Public results reflect actual database records.
14. Downloadable fan cards work in vertical and square formats.
15. WhatsApp sharing uses the configured public URL.
16. Fan-card wording accurately reflects whether a vote has been completed.
17. Images have been selected and used appropriately.
18. Administrative access is protected.
19. Database policies prevent unauthorized vote manipulation.
20. Payment, mobile, sharing, and security tests have been run.
21. Setup and deployment documentation is complete.

## FINAL DIRECTIVE

Build GOAT Wars as a real, deployable football debate platform using Cloudflare Pages for the frontend, Cloudflare Workers for trusted backend operations, Supabase for persistent data, and Paystack for supported payments.

Preserve useful existing code. Do not invent the official website domain. Do not fabricate votes, payments, image permissions, test results, or deployment status.

Deliver working software, clear documentation, and an honest report of any remaining blockers.