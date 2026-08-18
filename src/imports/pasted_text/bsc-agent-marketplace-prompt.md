FIGMA MAKE MASTER PROMPT
BSC FINANCIAL-AGENT MARKETPLACE
FULL PRODUCT UI/UX SOURCE OF TRUTH

========================================================
0. YOUR ROLE
========================================================

Act as a senior fintech product designer, financial marketplace UX architect, Web3 UX specialist, interaction designer, design-system architect, and production React frontend designer.

You are designing a serious consumer marketplace for autonomous financial agents on BNB Smart Chain/BSC.

This is NOT:

- a generic AI-agent marketplace;
- an NFT marketplace;
- an app store with agent cards;
- a chatbot with a marketplace attached;
- an agent social network;
- a workflow builder;
- a crypto casino;
- a trading terminal;
- a generic DeFi dashboard;
- a BNB Chain block explorer;
- an admin dashboard disguised as a consumer product.

The product must feel like a premium financial marketplace where users can:

Understand what financial work may need attention.
Discover suitable specialist agents.
Evaluate them using evidence.
Compare meaningful financial metrics.
Understand exactly what authority an agent needs.
Try agents before trusting them.
Activate individual agents.
Combine compatible specialists into Smart Money Plans.
Monitor active agents.
See what agents have done.
Review and revoke their authority.
Measure actual outcomes.

The interface should make sophisticated autonomous financial infrastructure feel understandable, calm and controlled.

Do not simplify away the depth described in this prompt.

========================================================
1. PRODUCT THESIS
========================================================

Design a decision-and-activation marketplace for BSC financial agents.

The product should help a user answer:

1. What could an agent help me with?
2. Which agent fits my exact financial situation?
3. Why should I trust this agent?
4. What authority will I give it?
5. What is it doing after activation?
6. Did using it actually help?

Primary lifecycle:

Understand
→ Discover
→ Match
→ Evaluate
→ Compare
→ Try
→ Authorize
→ Activate
→ Monitor
→ Measure
→ Reassess
→ Continue / Switch / Combine

The product must work for users who already know which kind of agent they need AND users who have no idea which category is relevant.

========================================================
2. THE FOUR REQUIRED FINANCIAL CATEGORIES
========================================================

These four categories must have EQUAL visual and product depth.

Do not create one excellent category and turn the other three into generic cards.

CATEGORY 1 — REBALANCING

Human-facing goal:
“Manage my liquidity”

Official category:
Rebalancing

Main decision question:
“Which agent can manage this LP position effectively?”

Relevant decision data includes:

- supported protocol;
- pool;
- asset pair;
- concentrated-liquidity support;
- current range compatibility;
- strategy type;
- time-in-range history;
- rebalance frequency;
- rebalance success history;
- costs;
- minimum capital;
- execution mode;
- permission intensity;
- marketplace testing;
- readiness.

Useful category visual:
A horizontal liquidity range graphic showing lower bound, upper bound and current price.

Do not require users to understand ticks before understanding whether their position is in or out of range.


CATEGORY 2 — GRID TRADING

Human-facing goal:
“Automate a trading strategy”

Official category:
Grid Trading

Main decision question:
“Which strategy fits this pair, capital level and current market context?”

Relevant decision data includes:

- supported pair;
- grid type;
- range;
- grid count;
- spacing;
- available capital;
- stop loss support;
- take profit support;
- adaptive re-grid;
- market regime compatibility;
- observed realised P&L;
- unrealised P&L;
- net P&L;
- max drawdown;
- fills;
- trading fees;
- strategy runtime;
- permission intensity;
- marketplace testing.

Useful category visual:
Structured horizontal price levels with current price and recent grid fills.

Do not use giant candlestick charts as the main UX.
This is marketplace evaluation, not a TradingView clone.


CATEGORY 3 — YIELD OPTIMISATION

Human-facing goal:
“Put capital to work”

Official category:
Yield Optimisation

Main decision question:
“Which agent gives the best appropriate risk/liquidity-adjusted yield strategy for this user?”

Relevant decision data includes:

- asset;
- supported protocols;
- current reported APR/APY;
- estimated net APR/APY;
- historical realised yield when available;
- reward composition;
- liquidity;
- withdrawal restrictions;
- risk band;
- protocol diversity;
- switching/reallocation support;
- agent fees;
- protocol costs;
- permission intensity;
- marketplace testing.

Useful category visual:
Gross return → protocol costs → agent costs → net result.

Never present all yield numbers as simply “APY”.


CATEGORY 4 — HEALTH FACTOR MONITORING

Human-facing goal:
“Protect my borrowing position”

Official category:
Health Factor Monitoring

Main decision question:
“Which agent can reliably monitor or protect this lending position?”

Relevant decision data includes:

- lending protocol;
- collateral;
- debt;
- current health/risk state;
- monitoring interval;
- detection latency;
- alert support;
- recommendation support;
- automatic intervention support;
- supported interventions;
- observed reliability;
- historical failures;
- permission intensity;
- marketplace testing.

Useful category visual:
A calm safety bar or health-factor trend showing current state versus warning and liquidation thresholds.

This category must NOT use generic investment-return metrics.

========================================================
3. PRIMARY NAVIGATION
========================================================

CONSUMER DESKTOP NAVIGATION:

Logo
Home
Explore
Smart Money Check
My Agents

Right side:
Search
Notifications
Wallet / Profile

Do not add permanent top-level navigation for:

Compare
Evidence
Permissions
Outcomes
Tests
Smart Money Plans
AI Assistant
Reviews

Those are contextual systems.

CONSUMER MOBILE BOTTOM NAV:

Home
Explore
Check
My Agents

Search, notifications and wallet/account live in the top bar.

Do NOT use a permanent global sidebar in the consumer product.

The Operator Workspace may use its own local sidebar because it is a management interface.

========================================================
4. HOME
========================================================

HOME MUST BE GOAL-FIRST, NOT AGENT-CARD-FIRST.

FIRST-TIME HOME:

Hero should quickly communicate:

“Put the right BSC agent to work for your money.”

Supporting idea:
Discover, compare and safely activate financial agents.

Primary CTA:
Check My Wallet

Secondary CTA:
Explore Agents

Trust line:
“Read-only until you choose to activate an agent.”

Immediately show four understandable goals:

Manage my liquidity
Rebalancing

Automate trading
Grid Trading

Put capital to work
Yield Optimisation

Protect my borrowing position
Health Factor Monitoring

Add a prominent section:

“Don’t know what you need?”

Explain that Smart Money Check reads supported public BSC portfolio data and identifies where specialist agents may be useful.

CTA:
Run Smart Money Check

Include a small curated Smart Money Plans section.

Possible plans:

Earn & Protect
Yield Optimisation + Health Monitoring

LP Autopilot
Rebalancing + Yield Optimisation

Managed DeFi Position
Rebalancing + Yield Optimisation + Health Monitoring

Do not show dozens of plans.

Include a trust section explaining:

Marketplace identity
Evidence
Marketplace tests
Scoped permissions
Revocation

RETURNING USER HOME:

The page hierarchy changes.

1. Needs your attention
2. Working for you
3. New Smart Money Check findings
4. Active Smart Money Plans
5. Recent outcomes
6. Run Smart Money Check again
7. Secondary discovery

Do not keep returning users trapped in a marketing landing page.

========================================================
5. EXPLORE
========================================================

Explore is the canonical marketplace.

Top:

Page title:
Explore BSC financial agents

Global marketplace search input.

Natural-language example:
“USDT yield with low permissions and anytime liquidity”

Show interpreted structured filters after natural-language input.

Category tabs:

All
Rebalancing
Grid Trading
Yield Optimisation
Health Factor Monitoring

Marketplace mode toggle:

Agents
Smart Money Plans

Desktop layout:

Left:
Filter panel

Right:
Results

Mobile:
Filters open as bottom sheet or drawer.

GLOBAL FILTERS INCLUDE:

Protocol
Asset
Pair
Availability
Permission intensity
Pricing
Evidence
Marketplace tested

SORTING:

Best Fit — only when context exists
Strongest Evidence
Lowest Authority
Lowest Cost
Recently Tested
Most Active

Do not invent “Top Agent” rankings with no methodology.

========================================================
6. AGENT CARD
========================================================

Cards must look like financial-service listings, NOT NFT cards.

Avoid giant illustrations or oversized logos.

Required visual hierarchy:

Agent identity
Service name
Category
Operational status
2–4 category-specific decision metrics
Permission intensity
Evidence status
Pricing
Supported protocol/assets
Compare control
View Agent action

Example Yield card:

YieldPilot                         READY NOW

USDT Yield Optimisation

8.4%
Current eligible rate

7.6%
Observed 30d realised yield

Moderate risk
Low authority

PancakeSwap · Venus

Marketplace Tested

$5/month + protocol costs

[ ] Compare                        View Agent →

If opened from Smart Money Check, prioritize:

“Why this matches your situation”

instead of generic promotional copy.

========================================================
7. CATEGORY MARKETPLACE — REBALANCING
========================================================

Header:
Keep your liquidity position working

Secondary:
Rebalancing Agents

Optional position selector:
Select a detected BSC LP position.

If contextual:

BNB/USDT
PancakeSwap
~$4,200
Outside range

Filters:

Protocol
Pair
Pool type
Strategy type
Auto execution
Approval required
Position size
Permission intensity
Cost
Evidence

Cards prioritize:

Pair/pool support
Range strategy
Observed time in range
Rebalance frequency
Rebalance success
Cost
Authority
Readiness

Include useful small range visuals.

========================================================
8. CATEGORY MARKETPLACE — GRID
========================================================

Header:
Automate buying and selling across a price range

Inputs:

Pair
Capital
Risk preference

Market-context strip:

Example:
“Recent BNB/USDT behavior: Range-bound · Medium confidence · 7-day observation”

Never say:
“Perfect market for grid trading.”

Filters:

Pair
Grid type
Spacing
Adaptive re-grid
Stop loss
Take profit
Market regime
Capital minimum
Permission intensity
Cost
Evidence

Cards prioritize:

Pair
Grid strategy
Observed net P&L
Max drawdown
Fills
Runtime
Market-regime support
Authority

========================================================
9. CATEGORY MARKETPLACE — YIELD
========================================================

Header:
Put eligible capital to work

Inputs:

Asset
Amount
Priority
Liquidity requirement

Priority options:

Protect capital
Balanced
Maximise eligible yield

Liquidity:

Anytime
Can wait
No preference

Filters:

Asset
Protocol
Risk band
Liquidity
Minimum current rate
Auto-reallocation
Reward composition
Authority
Pricing
Evidence

Cards must distinguish:

Current reported rate

Estimated net rate

Observed realised yield

Never collapse them into one unlabeled percentage.

========================================================
10. CATEGORY MARKETPLACE — HEALTH
========================================================

Header:
Protect a borrowing position

Inputs:

Protocol
Detected position
Protection mode

Protection modes:

Alert me only

Recommend actions

Automatically protect within limits

Filters:

Protocol
Monitoring frequency
Alert only
Recommend
Automatic intervention
Supported intervention
Permission intensity
Cost
Evidence

Cards prioritize:

Protocol
Protection mode
Monitoring interval
Detection latency
Reliability
Supported intervention
Authority

No meaningless APY/P&L fields.

========================================================
11. SMART MONEY CHECK — START
========================================================

This is a signature product experience.

Page title:

Smart Money Check

Supporting copy:

“See where supported BSC financial agents could help your portfolio.”

Clearly state:

“Smart Money Check is read-only.”

“Nothing can move your funds during this scan.”

Three entry methods:

Connect Wallet

Enter BSC Address

Try Example Portfolio

Include current coverage block:

BSC balances
Supported PancakeSwap positions
Supported Venus positions
Supported yield opportunities
Supported grid-market context
Marketplace agent matches

Do not imply every BSC protocol is supported.

========================================================
12. SMART MONEY CHECK — SCAN
========================================================

Use calm structured progress.

Example:

Wallet assets                  ✓
PancakeSwap positions          ✓
Venus lending positions        ●
Market context                 ○
Agent compatibility            ○

Include persistent:
“Still read-only.”

If one source fails, continue other checks.

Example:

“Venus data temporarily unavailable.
Other checks will continue.”

Do NOT use gimmicky AI brain animations.

========================================================
13. SMART MONEY CHECK — RESULTS
========================================================

Header:

Your Smart Money Check

Show:

Wallet
Checked timestamp
Supported portfolio value if defensible
Positions detected
Needs attention count
Opportunity count
Coverage state

Sections in priority order:

NEEDS ATTENTION

OPPORTUNITIES

SMART MONEY PLAN

HEALTHY / ALREADY COVERED

OTHER WAYS AGENTS CAN HELP

COVERAGE & SOURCES

RUN CHECK AGAIN

Never say:
“Your portfolio is safe.”

Use:
“No urgent issue detected in the supported positions we checked.”

========================================================
14. FINDING CARD SYSTEM
========================================================

All findings use the same basic structural system.

Finding states:

Needs Attention
Opportunity
Healthy
Informational
Could Not Assess

Severity is separate from confidence.

Severity:
Info
Opportunity
Attention
Urgent

Confidence:
High
Medium
Low
Unavailable

Required content:

State
Category
Headline
Short explanation
2–4 key evidence values
Why it matters
Confidence
Freshness
Provenance
Uncertainty if relevant
What an agent could do
One primary CTA
Evidence secondary action

Example:

NEEDS ATTENTION                  Rebalancing

Your BNB/USDT LP is outside its active range.

Current price       $X
Active range        $A–$B
Position value      ~$4,200

High-confidence finding
Checked 18 sec ago

[ Find Rebalancing Agents ]      Evidence →

Expanded state includes:

Why this matters

What an agent could do

Evidence

What we calculated

What we are uncertain about

Coverage limitations

========================================================
15. FINDING-SPECIFIC DATA
========================================================

REBALANCING FINDING:

Protocol
Pool
Pair
Position
Current price
Lower range
Upper range
Distance to boundary
Position value
Unclaimed fees where available
Freshness

CTA:
Find Rebalancing Agents


GRID FINDING:

Pair
Supported holdings
Available capital
Current price
Recent range
Volatility
Market regime
Regime confidence
Compatible services

CTA:
Compare Grid Strategies


YIELD FINDING:

Asset
Amount not deployed in supported yield position
Current yield position if any
Current eligible rate range
Number of supported opportunities
Liquidity/risk preference state

CTA:
Find Yield Agents


HEALTH FINDING:

Protocol
Collateral
Debt
Health factor or protocol-specific equivalent
Safety buffer
Oracle freshness
Protection mode
Existing monitoring agent if any

CTA:
Review Protection Agents

If safety-critical inputs are stale:
Could Not Assess.

========================================================
16. CONTEXT BAR
========================================================

Create a reusable Context Bar.

Example:

Checking agents for:

BNB/USDT
PancakeSwap
LP outside range
~$4,200

Change context

This context must persist through:

Recommendations
Agent Profile
Compare
Try Agent
Permission Checkout

Do not make the user repeatedly reselect the same position.

========================================================
17. RECOMMENDATION RESULTS
========================================================

Recommendation results are different from generic Explore.

Header example:

Agents for your BNB/USDT position

Show pinned Context Bar.

Recommended starting points:

Best Fit

Lower Authority

Lower Cost

Strongest Evidence

Not every category needs all four if unsupported.

Each recommendation includes:

Why this matches

Trade-offs

Example:

BEST FIT
RangeKeeper

Why it matches:
Supports this exact PancakeSwap pool
Supports automatic rebalancing
Marketplace tested
Current service ready

Trade-off:
Requires more authority than monitor-only alternatives

Actions:

View Agent
Compare

Also show:
View all compatible agents

If zero exact matches:

“We found the need, but no currently available service satisfies every requirement.”

Show failed compatibility dimensions.

Never silently widen the user’s constraints.

========================================================
18. AGENT PROFILE
========================================================

Agent Profile must feel like a financial-product decision page.

Desktop:

Main content left
Sticky decision rail right

Mobile:

Single-column
Sticky bottom action bar

Header required:

Agent name
Identity / ERC-8004 indicator
Operator
Service selector if agent has multiple services
Category
Availability
Marketplace-test status
Short service description

If contextual:

“Viewing this service for your detected BNB/USDT position.”

Navigation/tabs:

Overview
Strategy
Performance
Risk
Evidence
Permissions
Tests
Reviews

Decision rail:

Pricing
Risk/strategy summary
Permission intensity
Availability

Actions:

Try Agent
Compare
Activate Agent

========================================================
19. AGENT PROFILE — OVERVIEW
========================================================

Required:

What it does

Who it is for

Supported protocols

Supported assets / pairs / pools

Automation mode

Capital requirements

Primary category metrics

Current availability

Price

Authority summary

Marketplace evidence summary

Why this matches the user — when context exists

========================================================
20. AGENT PROFILE — STRATEGY
========================================================

Plain-language explanation first.

Example:

“YieldPilot compares supported USDT opportunities and may reallocate capital when another eligible strategy exceeds configured improvement thresholds.”

Then advanced:

Trigger model
Decision logic
Supported market conditions
Execution model
Limits
Known unsuitable conditions

Do not use meaningless:
“Powered by advanced proprietary AI.”

If implementation is proprietary, explain what is known and what is not disclosed.

========================================================
21. AGENT PROFILE — PERFORMANCE
========================================================

Performance is category-specific.

Time-range controls where evidence exists:

7D
30D
90D
All

Every metric shows:

Value
Period
Provenance
Sample size where appropriate

Examples:

Marketplace Observed

Marketplace Derived

External

Operator Claimed

Never graph Operator Claimed performance on the same visual axis as Marketplace Observed without explicit differentiation.

========================================================
22. AGENT PROFILE — RISK
========================================================

Include:

Strategy risks

Protocol dependencies

Market conditions

Operational failure modes

Permission implications

Historical marketplace incidents when relevant

Conditions where the strategy may be unsuitable

Do not turn this into generic disclaimer boilerplate.

========================================================
23. AGENT PROFILE — EVIDENCE
========================================================

Group evidence:

MARKETPLACE OBSERVED

MARKETPLACE DERIVED

ONCHAIN / EXTERNAL

OPERATOR SUPPLIED

Example:

Marketplace Observed
24 successful jobs
96% readiness
4 standardized tests passed

External
ERC-8004 identity
42 external feedback records

Operator Supplied
Historical strategy report
12-month reported performance

Every evidence item can open a reusable Evidence Drawer.

========================================================
24. EVIDENCE DRAWER
========================================================

Required fields:

Value

What this means

Provenance

Source

Observed time or reporting period

Freshness

Sample size

Calculation methodology if derived

Limitations

Underlying evidence

Example:

Current health factor
1.28

Type:
Observed

Source:
Venus protocol state

Observed:
28 seconds ago

Related marketplace calculation:
Safety buffer

Method:
health.buffer.v1

Do not overwhelm normal users with this detail by default.

========================================================
25. AGENT PROFILE — PERMISSIONS
========================================================

Human-readable first.

Example:

THIS SERVICE NORMALLY NEEDS

Can use:
USDT

Can interact with:
PancakeSwap
Venus

Can:
Allocate supported capital
Withdraw from supported strategy

Cannot:
Transfer to arbitrary wallets
Use unrelated tokens

Limits:
Configurable

Expiry:
Supported

Revocation:
Supported

Then:
View advanced contract/function details

Explicitly state:

“Your actual authority is selected during activation.”

Do not confuse normal service requirements with an actual user grant.

========================================================
26. AGENT PROFILE — TESTS
========================================================

Show marketplace tests.

Example:

Yield opportunity comparison
PASSED
BSC Testnet
Aug 15

Permission compliance
PASSED

Runtime readiness
98% over 30 days

Actions:

View Test Evidence
Try Agent

No giant engineering console.

========================================================
27. AGENT PROFILE — REVIEWS
========================================================

Separate:

Verified Marketplace Reviews

External Reputation

Never blend them into one unlabeled star rating.

Marketplace review only exists if there was qualifying marketplace usage.

========================================================
28. COMPARE
========================================================

Maximum 3 services.

Contextual header when applicable.

Example:

Comparing agents for:
BNB/USDT · PancakeSwap · Outside range

Top block:
What matters most / Biggest Differences

AI may explain only structured differences.

Then comparison groups:

Overview
Strategy
Performance
Risk
Evidence
Authority
Cost

COMMON ROWS:

Availability
Price
Automation mode
Permission intensity
Marketplace testing
Identity
Evidence depth
Protocol support
Capital requirements

CATEGORY-SPECIFIC ROWS follow the four distinct schemas.

Missing metric:

“Insufficient evidence”
“11 days observed”

Never render missing performance as zero.

Do not visually declare one agent “winner” with giant green styling.

========================================================
29. TRY BEFORE YOU TRUST
========================================================

From Agent Profile:

Try Agent

Available modes where supported:

Demo

Simulation

BSC Testnet

Historical replay

Clearly label environment.

Example page:

Try YieldPilot

Selected:
Simulation

What this will test:
...

What will NOT happen:
No live transaction

CTA:
Run Simulation

RESULT VIEW:

Completed successfully / Failed / Inconclusive

What the agent saw

What it decided

What it would do / did

Response time

Cost

Permission compliance

Environment

Evidence

Actions:

Activate Agent
Compare Alternatives
Run Another Test

Do not make every casual Try run automatically become marketplace benchmark evidence.

========================================================
30. SMART MONEY PLANS
========================================================

Smart Money Plans are curated combinations of compatible specialists.

Do not build a general workflow builder.

Plan browse cards require:

Plan name

Financial goal

Specialist categories involved

Short explanation

Estimated cost where possible

Combined authority summary

Evidence/readiness state

Example plans:

Earn & Protect
Yield + Health

LP Autopilot
Rebalancing + Yield

Managed DeFi Position
Rebalancing + Yield + Health

Do not force Grid into Plans merely to include all categories.

========================================================
31. SMART MONEY PLAN PROFILE
========================================================

Example:

EARN & PROTECT

Goal:
Earn on eligible capital while continuously monitoring borrowing risk.

WHY MULTIPLE SPECIALISTS?

YieldPilot
Optimises supported yield opportunities.

VenusGuard
Monitors borrowing health.

WHY THIS PLAN MATCHES YOU:

2,750 USDT not deployed in supported yield position

Venus borrowing position detected

Both services support BSC

Permission model compatible

AGENT ROLES:

Yield role
[ YieldPilot ▼ ]

Health role
[ VenusGuard ▼ ]

Allow swapping/replacing the selected specialist.

Show:

Combined cost

Combined authority

Combined risks

Individual evidence

Compatibility

What each agent controls

Outcome expectations where defensible

Actions:

Compare Alternative Combination
Activate Plan

========================================================
32. SMART MONEY PLAN — COMBINED AUTHORITY
========================================================

Never reduce this to only:
“Risk: Medium.”

Show:

YieldPilot
USDT
PancakeSwap + Venus
Up to $500/day

VenusGuard
Read-only monitoring

Shared assets:
USDT

Arbitrary transfers:
None

Longest session:
30 days

Actions:
View detailed authority

========================================================
33. PERMISSION CHECKOUT
========================================================

This is a critical product experience.

Progress indicator:

Job
→ Authority
→ Limits
→ Cost
→ Risk
→ Review

Use a dedicated page flow.

Do not hide this inside a tiny modal.

========================================================
34. CHECKOUT — JOB
========================================================

Show:

Agent/service

Exact job

Target position/assets

Protocol

Automation mode

Duration

Example:

RangeKeeper

Job:
Manage this BNB/USDT PancakeSwap liquidity position.

Position:
~$4,212

Mode:
Automatic within limits

CTA:
Continue

========================================================
35. CHECKOUT — AUTHORITY
========================================================

Human language first.

THIS AGENT WILL BE ABLE TO:

Manage this BNB/USDT LP

Call approved PancakeSwap functions

Use only specified assets/position

THIS AGENT WILL NOT BE ABLE TO:

Transfer to arbitrary wallets

Use unrelated protocols

Access unrelated wallet assets

Advanced contract/function details expandable.

Restrictions should NOT be styled as negative red errors.
They are positive safety constraints.

========================================================
36. CHECKOUT — LIMITS
========================================================

Exact numeric controls.

Avoid relying only on sliders.

Example:

Daily execution limit
[$200]

Suggestions:
$100
$200
$500

Maximum single action
[$75]

Session duration
[7 days]

Approval mode:
Automatic within limits
Ask before execution

Category-specific inputs:

Health:
Alert threshold
Auto-intervention cap

Grid:
Capital allocation
Trading limits

Yield:
Maximum capital
Protocol constraints

Rebalancing:
Position scope
Execution cap
Frequency controls

========================================================
37. CHECKOUT — COST
========================================================

Separate:

Agent fee

Protocol costs

Estimated gas

Performance fee

Other known costs

Estimated starting/period cost

Explicitly label estimates.

Never hide protocol cost inside agent price.

========================================================
38. CHECKOUT — RISK
========================================================

Show:

Strategy risk

Protocol risk

Authority risk

Failure behavior

Auto-execution implications

Revocation behavior

Known limitations

Keep language calm and specific.

Do not use walls of legal boilerplate.

========================================================
39. CHECKOUT — REVIEW
========================================================

Human-readable activation contract.

Example:

“You are activating RangeKeeper to manage your BNB/USDT PancakeSwap position for 7 days with a maximum daily execution amount of $200. It cannot transfer funds to arbitrary addresses.”

Then summarize:

Job

Assets

Protocol

Limits

Authority

Expiry

Cost

Revocation

Risk acknowledgement

Primary CTA:

Authorize & Activate

========================================================
40. CHECKOUT FAILURE STATES
========================================================

QUOTE EXPIRED

“Costs changed while you were reviewing.”

CTA:
Refresh Quote


WALLET REJECTED

“Nothing was activated.”

CTA:
Try Again


PERMISSION CREATED, ACTIVATION FAILED

This state is critical.

Show prominently:

Permission created
Agent activation failed

“The agent is not currently working, but its permission exists.”

Actions:

Retry Activation

Revoke Permission

Do not hide this state.

========================================================
41. MY AGENTS
========================================================

Tabs:

Overview
Agents
Plans
Activity
Authority
Outcomes

OVERVIEW PRIORITY:

Needs Attention

Working for You

Active Plans

Recent Outcomes

Smart Money Check

Run Again

========================================================
42. ACTIVE AGENT CARD
========================================================

Different visual language from marketplace cards.

Example:

RangeKeeper                         ACTIVE

BNB/USDT LP
PancakeSwap

Current state:
In range

94% time in range · 30d

Last action:
Rebalanced 2h ago

Authority:
$67 / $200 today

View →

========================================================
43. ACTIVE AGENT DETAIL
========================================================

Required:

Agent/service

Activation state

Managed position/assets

Start date

Current category-specific state

Runtime health

Last action

Recent activity

Permission usage

Cost

Outcomes

Alerts

Actions:

Pause

Resume

Change Limits — when supported

Compare Alternatives

Review Authority

Revoke / End

========================================================
44. ACTIVE PLAN
========================================================

Show:

Plan goal

Plan state

Specialist members

Each member role

Each member state

Current financial state

Combined authority

Combined cost

Recent activity

Combined outcomes

Incidents

Actions:

Replace Agent

Pause member

Review permissions

End Plan

If one required specialist fails, do NOT show Plan as fully Active.

========================================================
45. ACTIVITY
========================================================

Readable timeline.

Not raw blockchain logs.

Example:

20:03

VenusGuard checked your borrowing position.

Health factor: 1.42
No action required.

Evidence


18:43

YieldPilot compared 8 eligible opportunities.

No reallocation performed.

Why?


14:16

RangeKeeper rebalanced BNB/USDT.

Confirmed on BSC

Cost: $1.24

View transaction

Filters:

Agent

Plan

Category

Event type

Status

Date

========================================================
46. AUTHORITY CENTER
========================================================

Page title:
Agent Authority

Supporting copy:
“This shows what your active agents are currently allowed to do.”

Top summary:

Active grants

High-authority grants

Expiring grants

Near-limit grants

GRANT CARD:

Agent/service

Wallet

Provider

Protocols/contracts

Functions

Assets

Daily limit

Total limit

Usage

Expiry

Transfer capability

Withdrawal capability

Grant state

Actions:

Review
Change Limits — if supported
Revoke

Show permission state separately from activation state.

========================================================
47. AUTHORITY STATES
========================================================

Pending

Active

Near Limit

Exhausted

Expiring

Expired

Revocation Pending

Revoked

Provider Error

Use icon + label + color.

Never color alone.

========================================================
48. OUTCOMES
========================================================

Page title:
Outcomes

Core question:
“Was using these agents useful?”

Filters:

Period

Agent

Plan

Category

Wallet

DO NOT create one fake:
“Total AI Profit”

Keep category outcomes separate.


REBALANCING:

Time in range

Fees earned

Rebalance count

Rebalance cost

Gas

Net LP components


GRID:

Realised P&L

Unrealised P&L

Net P&L

Max drawdown

Fills

Fees

Runtime


YIELD:

Gross yield

Protocol costs

Agent fee

Gas

Net yield

Realised APY

Allocation changes


HEALTH:

Checks

Risk events

Alerts

Detection latency

Interventions attempted

Interventions successful

Failures

Use waterfall/breakdown patterns.

Example:

Gross yield                 +$43.20
Protocol costs               -$2.10
Agent fee                     -$4.00
────────────────────────────────────
Net result                   +$37.10

Every outcome supports:
View Evidence

========================================================
49. SWITCH AGENT
========================================================

From an active service:

Compare Alternatives

Persist managed-position context.

Show:

Current Agent
vs
Replacement

Differences:

Strategy

Evidence

Authority

Cost

Availability

Transition costs

What changes if you switch?

Flow:

Select replacement

Authorize replacement

Verify replacement active

Then revoke/terminate old service

Especially for Health, do not visually imply the old monitor should stop before the replacement is active.

========================================================
50. NOTIFICATIONS
========================================================

Group by importance.

NEEDS ACTION:

Health warning

Permission near cap

Activation failure

Agent offline

PLAN degraded


ACTIVITY:

Completed action

Rebalance

Allocation change


PORTFOLIO:

New finding

Changed finding

New supported opportunity


SYSTEM:

Service availability

Keep safety alerts visually stronger than opportunities.

Do not mix marketing notifications into operational alerts.

========================================================
51. OPERATOR WORKSPACE
========================================================

Separate workspace.

Local desktop sidebar allowed:

Dashboard
Agents
Services
Tests
Evidence
Usage
Settings

This should visually feel related to the consumer product but more operational.

========================================================
52. OPERATOR DASHBOARD
========================================================

Required:

Action Required

Marketplace status

Active listings

Services

Degraded services

Readiness

Recent activations

Failed tests

Operational health

Recent usage

No social creator analytics.

========================================================
53. OPERATOR AGENT PAGE
========================================================

Show:

Agent identity

ERC-8004 identity reference

Operator status

Listing state

Services

Marketplace readiness

Evidence

Moderation/readiness issues

Actions according to lifecycle:

Claim

Complete Listing

Submit

Edit

Pause

Retire

========================================================
54. OPERATOR SERVICE EDITOR
========================================================

Guided sections:

Basics

Capabilities

Category Setup

Pricing

Permissions

Runtime

Evidence

Tests

Review

Include sticky Listing Readiness panel.

Example:

Identity                ✓
Service details         ✓
Pricing                 ✓
Permission test         !
Endpoint                 ✓

========================================================
55. OPERATOR CATEGORY CONFIGURATION
========================================================

REBALANCING:

Pool types

Strategy

Triggers

Execution mode

Slippage controls


GRID:

Pairs

Grid type

Spacing

Stop loss

Re-grid

Capital minimum


YIELD:

Protocols

Assets

Risk bands

Strategy selection

Reallocation

Withdrawal assumptions


HEALTH:

Protocols

Monitoring frequency

Alerts

Interventions

Thresholds

========================================================
56. OPERATOR EVIDENCE
========================================================

Strict split:

MARKETPLACE EVIDENCE
Read-only

Observed uptime

Marketplace tests

Production outcomes


YOUR CLAIMS
Editable

Historical performance

Strategy document

Research report

Methodology

Always label operator data:

Operator Supplied

Operators cannot edit marketplace observations.

========================================================
57. OPERATOR TESTS
========================================================

Show:

Required tests

Optional tests

Version

Environment

Last run

Result

Failure reason

Evidence

Actions:

Run Test

Retry

View Evidence

Marketplace test result cannot be edited.

========================================================
58. GLOBAL VISUAL DIRECTION
========================================================

Use a PREMIUM DARK FINANCIAL INTERFACE.

Absolutely no white or off-white page background.

Base direction:

Canvas:
deep graphite / near-black

Primary surface:
dark charcoal

Raised surface:
slightly lighter charcoal

Borders:
subtle cool gray

Primary text:
soft near-white

Secondary text:
muted cool gray

Primary accent:
restrained mineral teal / blue-green

Positive:
restrained green

Attention:
muted amber

Critical:
controlled red

Opportunity:
teal/cyan

Informational:
muted blue/slate

BNB yellow:
use only for ecosystem attribution and BNB identity.
Do NOT make the entire product yellow and black.

Avoid neon.

Avoid exaggerated gradients.

Avoid giant glowing cards.

Avoid glassmorphism-heavy interfaces.

Avoid crypto-casino visuals.

Avoid generic “AI purple.”

========================================================
59. TYPOGRAPHY
========================================================

Use a clean, premium neutral sans-serif with excellent financial/numeric legibility.

Use tabular numerals for tables and comparable metrics.

Hierarchy:

Hero:
large, used sparingly

Page title:
clear and confident

Section heading:
medium

Card title:
compact

Body:
comfortable

Metadata:
small but readable

Financial decision metrics:
strong, not absurdly oversized

Do not turn every percentage into a giant hero number.

========================================================
60. SURFACES AND SPACING
========================================================

Use medium information density.

Use an 8px-based spacing rhythm.

Cards should use moderate radius.

Avoid huge rounded bubbly containers.

Use subtle borders and luminance differences instead of giant shadows.

Financial information should feel organized, not decorative.

========================================================
61. STATUS VISUAL LANGUAGE
========================================================

Every status must use:

Icon
+
Text label
+
Color when appropriate

Examples:

READY NOW

NEEDS ATTENTION

OPPORTUNITY

HEALTHY

COULD NOT ASSESS

DEGRADED

OFFLINE

TESTNET ONLY

Do not rely on color alone.

========================================================
62. EVIDENCE VISUAL LANGUAGE
========================================================

Use consistent small provenance indicators.

MARKETPLACE OBSERVED:
Observed

MARKETPLACE DERIVED:
Calculated

EXTERNAL:
External

OPERATOR CLAIMED:
Operator supplied

Do not make Operator Supplied look automatically suspicious or bad.

The point is provenance, not moral judgement.

========================================================
63. AUTHORITY VISUAL LANGUAGE
========================================================

Support:

Read-only

Low authority

Medium authority

High authority

Always explain WHY.

Avoid turning legitimate automation permissions into scary red banners by default.

Authority should feel understandable and controllable.

========================================================
64. CATEGORY VISUALS
========================================================

REBALANCING:

Range bar

Lower boundary

Upper boundary

Current price

In/out-of-range state


GRID:

Structured price levels

Current price

Recent fills


YIELD:

Yield composition

Gross → costs → net


HEALTH:

Safety/health factor bar

Warning threshold

Liquidation threshold

Current value

Charts must answer a real question.

Do not add random charts for decoration.

========================================================
65. AI UX
========================================================

Do NOT create a permanent AI Assistant top-level navigation item.

AI appears contextually:

Explain this finding

Ask about this agent

Explain these differences

Explain this permission

Why did the agent do this?

Explain this outcome

AI explanation should appear in a side drawer or mobile bottom sheet.

Label it:

AI explanation

Supporting text:
“Grounded in the evidence shown on this page.”

Option:
Sources used

Do not use AI sparkles everywhere.

========================================================
66. RESPONSIVE DESIGN
========================================================

DESKTOP:

Top global navigation.

Explore uses filter sidebar.

Agent Profile uses sticky right decision rail.

Compare uses wide data table.

Operator workspace may use local sidebar.


TABLET:

Collapse filter panel.

Use sticky bottom/action rail when needed.

Keep evidence accessible.


MOBILE:

Bottom navigation:
Home
Explore
Check
My Agents

Single-column cards.

Sticky primary CTA on Agent Profile.

Checkout:
one step per screen.

Filters:
bottom sheet.

Evidence:
drawer/bottom sheet.

Compare:
horizontal candidate navigation while preserving aligned comparison rows.

Do not simply shrink desktop layouts.

========================================================
67. LOADING STATES
========================================================

Every major data area must have meaningful skeleton/loading states.

Examples:

Smart Money Check:
“Checking PancakeSwap positions…”

Agent Profile:
identity and static content load first;
performance block may skeleton separately.

Explore:
card skeletons.

Activity:
timeline skeleton.

Do not use generic full-page spinners unless unavoidable.

Do not say:
“AI is thinking…”

for deterministic data operations.

========================================================
68. EMPTY STATES
========================================================

SMART MONEY CHECK EMPTY:

“No immediate needs detected in the supported positions we checked.”

Supporting:
“This does not mean your entire portfolio is risk-free.”

Show checked sources.

Actions:
Explore Agents
View Coverage


NO AGENT MATCH:

“We found the need, but no currently available agent satisfies every requirement.”

Show:
requirements
failed compatibility dimensions

Actions:
Adjust relevant preference
Browse partial matches


NO ACTIVE AGENTS:

Explain what My Agents becomes after first activation.

CTA:
Explore Agents
Run Smart Money Check


NO OUTCOMES:

Explain minimum observation history required.

========================================================
69. ERROR STATES
========================================================

Errors must be specific.

Examples:

PancakeSwap position data unavailable

Venus risk inputs unavailable

8004 discovery unavailable

Agent endpoint offline

Permission provider unavailable

Activation failed

Transaction failed

Do not use only:
“Something went wrong.”

Always provide:

What failed

What is still available

Whether user funds/authority are affected

Recovery action

========================================================
70. PARTIAL DATA STATES
========================================================

This is critical.

Example:

PARTIAL DATA

PancakeSwap live position data is available.

Historical market data is temporarily unavailable.

Some comparison metrics have been hidden.

Continue rendering valid sections.

Do not turn every partial-source issue into a full-page failure.

========================================================
71. STALE DATA STATES
========================================================

Fresh:

Updated 18 sec ago

Warning:

Updated 34 min ago
Refreshing…

Hard stale:

Current value unavailable
Latest observation is too old for a current recommendation.

Never quietly display old financial information as live.

========================================================
72. SAMPLE DATA SEMANTICS
========================================================

Use realistic but explicitly synthetic sample data for design/prototype purposes.

Do NOT imply mock data is actual marketplace performance.

Use sample agents such as:

RangeKeeper
Rebalancing

GridPilot
Grid Trading

YieldPilot
Yield Optimisation

VenusGuard
Health Monitoring

These are working sample/reference names and should be easy to replace later.

EXAMPLE PORTFOLIO:

Wallet:
Example BSC Portfolio

Use realistic sample conditions that naturally demonstrate all four categories.

Example:

BNB/USDT PancakeSwap concentrated-liquidity position
~$4,200
currently outside range

2,750 USDT not deployed in a supported yield position

BNB + USDT balance compatible with a supported Grid strategy

Venus borrowing position
Health factor approximately 1.42
Watch state rather than immediate liquidation

This should create:

1 Rebalancing Needs Attention finding

1 Grid Opportunity finding

1 Yield Opportunity finding

1 Health Monitoring finding

and at least one Smart Money Plan suggestion:
Earn & Protect

All synthetic values must be labelled somewhere as:
Example Portfolio / Sample Data

========================================================
73. SAMPLE AGENT DATA RULES
========================================================

Sample metrics should look realistic and internally consistent.

Every sample performance metric must include:

provenance

period

sample size where appropriate

Example:

Observed realised yield
7.6%
Marketplace Observed
30 days
31 allocation checks

Not:

“Agent return 89%”

with no context.

For Operator Claimed examples:
clearly label them.

For unavailable values:
use Insufficient Evidence rather than inventing a value.

========================================================
74. SAMPLE SERVICE STATES
========================================================

Use a mixture of realistic service states to ensure design coverage:

Ready Now

Limited

Degraded

Offline

Testnet Only

Do not make every sample agent green/ready.

Example:

RangeKeeper:
Ready Now

GridPilot:
Ready Now

YieldPilot:
Limited because one opportunity source unavailable

VenusGuard:
Ready Now

Include at least one discovered/unclaimed external listing example somewhere in Explore.

========================================================
75. REQUIRED GLOBAL COMPONENTS
========================================================

Build reusable components rather than page-specific duplicates.

Core components:

AppShell

GlobalNav

MobileBottomNav

Search

ContextBar

PageHeader

SectionHeader

AgentCard

FindingCard

PlanCard

ActiveAgentCard

Metric

MetricGroup

EvidenceBadge

EvidenceDrawer

FreshnessIndicator

ReadinessPill

AuthorityBadge

PermissionSummary

RangeVisual

GridVisual

HealthVisual

YieldBreakdown

CompareTable

OutcomeBreakdown

ActivityTimeline

AlertCard

FilterPanel

AIExplanationDrawer

CheckoutStep

StatusTimeline

EmptyState

PartialDataBanner

ErrorState

LoadingSkeleton

========================================================
76. ACCESSIBILITY
========================================================

Design for:

Strong contrast

Keyboard navigation

Visible focus states

Large enough touch targets

Semantic heading hierarchy

Reduced-motion preference

Non-color-only status meaning

Screen-reader-friendly charts and data summaries

Accessible tables

Mobile reachability

========================================================
77. MOTION
========================================================

Use subtle motion only for state communication.

Good:

Finding expansion

Scan progress

Drawer transitions

Successful activation

Status changes

Chart updates

Bad:

Floating tokens

Particle systems

Robot animation

Constant glowing gradients

Animated backgrounds

Casino-style celebration effects

========================================================
78. COPY STYLE
========================================================

Voice:

Calm

Specific

Financial

Evidence-conscious

Non-hype

Examples of GOOD copy:

“Your position is close to its current range boundary.”

“Three services support this exact pool.”

“This metric is based on 18 marketplace-observed runs.”

“This service requires authority to use approved PancakeSwap functions.”

Examples of BAD copy:

“Supercharge your portfolio!”

“Unlock insane AI yields!”

“Never get liquidated again!”

“Guaranteed passive income!”

“AI found the perfect trade!”

========================================================
79. CRITICAL PRODUCT RULES — DO NOT SIMPLIFY AWAY
========================================================

DO NOT simplify Agent Identity, Agent Service and activation into one generic Agent object.

One agent identity may expose multiple services.

Activation must target a specific service.


DO NOT merge all four categories into one generic agent-card template.

Cards may share structure but category metrics must differ.


DO NOT reduce Smart Money Check to a portfolio dashboard.

It is a diagnostic system producing findings, evidence and agent handoffs.


DO NOT make Smart Money Check capable of moving funds.

It remains read-only.


DO NOT turn Smart Money Plans into an arbitrary workflow builder.

Plans are curated financial combinations of compatible specialist agents.


DO NOT use a universal unexplained Agent Score or Trust Score.


DO NOT combine Marketplace Observed, Marketplace Derived, External and Operator Claimed information without provenance labels.


DO NOT let unavailable or stale health data display as Healthy.


DO NOT let missing performance data display as zero.


DO NOT treat current APR as guaranteed future return.


DO NOT infer user risk tolerance from their wallet.


DO NOT infer user liquidity preference from wallet balances.


DO NOT infer wallet ownership just because an address was entered.


DO NOT assume an existing wallet balance is “idle” by user intent.

Use:
“Not currently deployed in a supported yield position we detected.”


DO NOT make AI responsible for eligibility, safety state, recommendation hard gates or permission scope.


DO NOT create an AI chatbot as the entire product experience.


DO NOT hide agent authority behind a generic wallet-signing screen.


DO NOT remove the six-step Permission Checkout.


DO NOT merge Permission Profile, Permission Request and Permission Grant concepts.


DO NOT assume activation success means permission state is safe or vice versa.


DO NOT hide the edge case:
Permission exists but activation failed.


DO NOT call a Smart Money Plan active if required member agents failed.


DO NOT force Grid Trading into every Plan.


DO NOT remove My Agents, Activity, Authority or Outcomes after activation.


DO NOT turn My Agents into a generic AgentPlace-style management system.


DO NOT add social feeds, teams, organizations, DAOs, creator profiles, generic workflows or general agent collaboration.


DO NOT create multichain navigation.

This marketplace is deliberately BSC-focused.


DO NOT show fake protocol support simply to fill cards.


DO NOT use fake live data without labelling it.


DO NOT make every service look Ready.


DO NOT hide stale/partial/error states.


DO NOT design only the happy path.


DO NOT create a white/light SaaS theme.

========================================================
80. REQUIRED PRODUCT STATES
========================================================

For every meaningful data-driven component, consider:

Default

Hover

Focused

Selected

Disabled

Loading

Ready

Empty

Partial

Stale

Source unavailable

Insufficient evidence

Error

Offline

Degraded

Testnet-only

Where applicable:

Authorization pending

Revocation pending

Activation failed

Permission active but service failed

========================================================
81. ROUTE / SCREEN MAP
========================================================

Create the product structure so these routes/screens can exist conceptually:

/

 /explore

 /explore/rebalancing

 /explore/grid-trading

 /explore/yield

 /explore/health

 /check

 /check/:session

 /check/:session/findings/:finding

 /check/:session/recommendations/:finding

 /agents/:agent

 /agents/:agent/services/:service

 /compare

 /plans

 /plans/:plan

 /try/:service

 /checkout/:checkout

 /my-agents

 /my-agents/:activation

 /my-plans/:plan-instance

 /my-agents/activity

 /my-agents/authority

 /my-agents/outcomes

 /account

 /operator

 /operator/agents

 /operator/agents/:agent

 /operator/services/:service

 /operator/tests

 /operator/evidence

 /operator/usage

No need to expose all internal routes as top-level navigation.

========================================================
82. JUDGE / DEMO FLOW
========================================================

The designed prototype must make this coherent:

Home

→ Try Example Portfolio

→ Smart Money Check

→ Four category-relevant findings

→ Open Rebalancing finding

→ Matching agents

→ Compare 3 agents

→ Agent Profile

→ Evidence

→ Try Agent

→ Permission Checkout

→ Activation success

→ My Agents

→ Activity

→ Outcome

Then:

Return to Smart Money Check

→ Earn & Protect Smart Money Plan

→ Yield + Health specialists

→ Combined authority

→ Activate Plan

The product should demonstrate its value through this journey without needing explanatory narration.

========================================================
83. PROTOTYPE INTERACTION EXPECTATIONS
========================================================

Where possible in Figma Make, make the prototype feel functional.

Examples:

Navigation works.

Tabs work.

Filters visibly update selected state.

Compare selection works.

Finding cards expand.

Evidence Drawer opens.

AI explanation drawer opens.

Smart Money Check moves through scan states.

Example portfolio produces predetermined findings.

Agent service selector changes visible service details.

Checkout progresses through steps.

Permission limits are editable.

Activation success leads to My Agents.

Activity opens transaction detail.

Authority grant can demonstrate revocation state.

Plan specialist selection can change.

Responsive layouts should work.

Use local/sample state where real backend APIs do not exist yet.

Do NOT fake blockchain functionality as though it is truly connected.

The frontend must be clearly structured so the sample data layer can later be replaced by real API calls.

========================================================
84. CODE / FRONTEND STRUCTURE
========================================================

Generate clean reusable React-style component architecture.

Avoid massive single-page components.

Prefer shared components and design tokens.

Keep data separate from presentation.

Create mock/sample data structures that resemble real domain objects rather than scattering literal text values throughout components.

Example:

agent
service
evidence
finding
permission
activation
outcome
plan

Do not put all marketplace data directly inside JSX.

The frontend will later be integrated with typed backend APIs.

========================================================
BACKEND / API INTEGRATION CONTRACT
========================================================

The frontend you are generating is NOT an isolated visual prototype.

It will later be connected to a real production marketplace backend implemented as a TypeScript application API with PostgreSQL, background workers, BSC/protocol adapters, marketplace evidence systems, agent runtimes, permission providers, and asynchronous blockchain workflows.

Design and generate the frontend so this integration can happen without redesigning the product or replacing major frontend components.

The UI must reflect the actual product/domain architecture described throughout this prompt.

Do not collapse backend/domain concepts merely to make mock frontend development easier.

========================================================
A. ARCHITECTURAL PRINCIPLE
========================================================

Use this conceptual structure:

UI Components
      ↓
Frontend Hooks / View Models
      ↓
Repository / API Client Layer
      ↓
Marketplace Application API
      ↓
Domain / Data / Integration Systems

External providers such as BSC, PancakeSwap, Venus, ERC-8004, 8004scan, Altana, Agent Studio and ERC-8183 must NOT be called directly from arbitrary presentation components.

The UI should normally consume normalized marketplace API resources.

Example:

FindingCard
→ receives a normalized Finding

NOT:

FindingCard
→ directly queries Venus


AgentCard
→ receives AgentListing + AgentService data

NOT:

AgentCard
→ directly calls ERC-8004 or 8004scan


AuthorityCard
→ receives PermissionGrant

NOT:

AuthorityCard
→ queries Altana simply to render


OutcomeBreakdown
→ receives normalized OutcomeMetric records

NOT:

OutcomeBreakdown
→ reconstructs performance directly from blockchain transactions


Keep external provider integration behind backend/application boundaries.

========================================================
B. CORE DOMAIN RESOURCES
========================================================

Treat the following as distinct first-class domain resources.

Do NOT flatten them into one giant frontend Agent, Wallet or Portfolio object.

USER / ACCOUNT DOMAIN

User

Wallet

UserPreference

NotificationPreference


AGENT / MARKETPLACE DOMAIN

AgentOperator

AgentIdentity

AgentListing

AgentService

AgentCapability

PricingModel

PermissionProfile

ServiceOffer / Commercial Terms

ReadinessSnapshot


TRUST / EVIDENCE DOMAIN

EvidenceRecord

EvidenceMethod

ExternalFeedbackRecord

MarketplaceReview

TestDefinition

TestRun

DataSource

CalculationMethod


SMART MONEY DOMAIN

CheckSession

PortfolioSnapshot

AssetPosition

LiquidityPositionSnapshot

LendingPositionSnapshot

MarketSnapshot

Finding

FindingEvidence

FindingUncertainty


RECOMMENDATION DOMAIN

RecommendationSession

RecommendationCandidate

SavedComparison


SMART MONEY PLAN DOMAIN

SmartMoneyPlanTemplate

PlanRole

PlanCompatibilityRule

PlanRecommendation

PlanInstance

PlanMember


ACTIVATION / AUTHORITY DOMAIN

Checkout

PermissionRequest

PermissionGrant

PermissionUsageSnapshot

Activation


RUNTIME DOMAIN

AgentAction

TransactionRecord

ActivityEvent

Alert

RuntimeIncident


OUTCOME DOMAIN

OutcomeWindow

OutcomeMetric

PlanOutcome

BenchmarkTask

BenchmarkRun

BenchmarkPair


OPERATOR DOMAIN

OperatorListingState

OperatorServiceConfiguration

OperatorEvidenceSubmission

ServiceReadinessState


These concepts may be represented with frontend-specific TypeScript interfaces or generated API types, but their semantic boundaries must remain intact.

========================================================
C. CRITICAL DOMAIN SEPARATIONS
========================================================

These distinctions are mandatory.

Do not simplify them away.

AGENT IDENTITY ≠ AGENT LISTING ≠ AGENT SERVICE

AgentIdentity:
Who the agent is canonically.

AgentListing:
How the marketplace represents that agent.

AgentService:
The specific financial service the user may evaluate and activate.


SERVICE ≠ OFFER

The same service may have current pricing, availability or commercial terms represented separately.


PERMISSION PROFILE ≠ PERMISSION REQUEST ≠ PERMISSION GRANT

PermissionProfile:
What a service normally requires.

PermissionRequest:
What this exact checkout asks this exact user to authorize.

PermissionGrant:
What was actually authorized.

The UI must never infer one from another.


ACTIVATION ≠ PERMISSION

An agent service can fail while a permission remains active.

A permission can be revoked while an activation still exists in a degraded/terminated state.

These must remain separate UI/backend states.


AGENT ACTION ≠ BLOCKCHAIN TRANSACTION

AgentAction:
What the service attempted or decided to do.

TransactionRecord:
The actual blockchain transaction, if one exists.

A monitoring event may have an AgentAction without a transaction.


TRANSACTION ≠ OUTCOME

A successful blockchain transaction does not automatically mean a positive financial outcome.

Outcome metrics are calculated separately using evidence and observation windows.


FINDING ≠ RECOMMENDATION

A Finding says:
“What did the marketplace detect?”

A Recommendation says:
“Which services fit that situation?”

Do not collapse both into one AI recommendation object.


PLAN ≠ SUPER-AGENT

Smart Money Plans coordinate separate specialist services.

Each specialist keeps its own:

AgentService

PermissionGrant

Activation

Activity

Outcome


EVIDENCE ≠ EXPLANATION

Evidence contains sourced facts.

AI Explanation translates and explains those facts.

AI text is never the source of truth.

========================================================
D. FRONTEND DATA ACCESS LAYER
========================================================

Create a dedicated frontend data-access abstraction.

Do not scatter fetch() calls throughout page components.

Prefer a structure conceptually similar to:

src/
  api/
    client.ts
    agents.ts
    checks.ts
    recommendations.ts
    plans.ts
    checkout.ts
    activations.ts
    permissions.ts
    outcomes.ts
    operator.ts

  repositories/
    agentRepository.ts
    smartMoneyRepository.ts
    activationRepository.ts
    authorityRepository.ts
    outcomeRepository.ts

  hooks/
    useAgents.ts
    useService.ts
    useCheckSession.ts
    useFinding.ts
    useRecommendations.ts
    useCheckout.ts
    useActivation.ts
    usePermissionGrant.ts
    useActivity.ts
    useOutcomes.ts


The exact folder structure may vary, but maintain the architectural idea:

presentation components must depend on data abstractions rather than direct provider/network logic.

========================================================
E. MOCK REPOSITORY REQUIREMENT
========================================================

For prototype/design operation, create a dedicated mock repository or mock API layer.

Do NOT hardcode sample objects directly inside visual components.

Do NOT scatter sample values throughout JSX.

Prefer:

MockAgentRepository

MockSmartMoneyRepository

MockRecommendationRepository

MockActivationRepository

MockAuthorityRepository

MockOutcomeRepository

or an equivalent centralized mock service layer.


Mock data must use realistic domain-shaped objects.

For example:

mockAgentIdentity

mockAgentListing

mockAgentService

mockEvidenceRecords

mockPermissionGrant

mockActivation

mockOutcomeWindow


The goal is that later we can replace:

MockRepository

with:

ApiRepository

without rewriting:

AgentCard

FindingCard

CompareTable

Checkout

MyAgents

Authority

Outcomes


The presentation layer should not care whether the source is mock or live.

========================================================
F. MOCK DATA MUST REPRESENT REAL API SHAPES
========================================================

Sample/mock resources should resemble future backend responses.

For example, do NOT create:

agent = {
  name,
  apy,
  score,
  status
}

when the actual UI depends on:

agentIdentity

agentListing

agentService

evidence

readiness

pricing

permissionProfile


Likewise, do not create a single:

walletAnalysis

blob.

Represent:

CheckSession

PortfolioSnapshot

Findings

Coverage

Evidence

separately.


Mock domain objects should include stable IDs so routes/actions can behave realistically.

Examples:

agentId

serviceId

findingId

checkSessionId

recommendationId

checkoutId

permissionGrantId

activationId

transactionId

outcomeWindowId

planInstanceId

========================================================
G. API CONTRACT ASSUMPTIONS
========================================================

Design the data-access layer to be compatible with a REST/OpenAPI-style backend.

Representative future endpoints include:

GET /v1/agents

GET /v1/agents/:agentId

GET /v1/services/:serviceId

GET /v1/services/:serviceId/evidence

GET /v1/services/:serviceId/tests

GET /v1/services/:serviceId/readiness


POST /v1/checks

GET /v1/checks/:checkSessionId

GET /v1/checks/:checkSessionId/findings

GET /v1/checks/:checkSessionId/events

GET /v1/findings/:findingId


POST /v1/recommendations

GET /v1/recommendations/:recommendationId


POST /v1/comparisons


GET /v1/plans

GET /v1/plans/:planId

POST /v1/plan-recommendations


POST /v1/checkouts

GET /v1/checkouts/:checkoutId

POST /v1/checkouts/:checkoutId/quote

POST /v1/checkouts/:checkoutId/authorize

POST /v1/checkouts/:checkoutId/activate


GET /v1/permissions

GET /v1/permissions/:permissionGrantId

POST /v1/permissions/:permissionGrantId/revoke


GET /v1/activations

GET /v1/activations/:activationId

GET /v1/activations/:activationId/activity

GET /v1/activations/:activationId/outcomes


GET /v1/activity


GET /v1/outcomes


GET /v1/operator/agents

POST /v1/operator/agents

GET /v1/operator/services

POST /v1/operator/services

POST /v1/operator/tests/:testId/run

GET /v1/operator/evidence

GET /v1/operator/usage


These endpoints are conceptual contracts.

Do not tightly couple presentation code to a specific mock URL.

Use typed repository/client functions.

========================================================
H. ASYNCHRONOUS PRODUCT OPERATIONS
========================================================

Many operations in this product are asynchronous.

Do not design the frontend as though every user action returns a final result immediately.

The UI must support long-running or multi-step backend workflows.

Examples include:

Smart Money Check

Agent readiness checks

Marketplace test runs

Permission creation

Permission reconciliation

Agent activation

Blockchain transaction confirmation

Smart Money Plan activation

Outcome calculation

Operator readiness/testing


Generic asynchronous lifecycle may include:

IDLE

QUEUED

RUNNING

PARTIAL

AWAITING_USER_ACTION

AWAITING_WALLET

AWAITING_CHAIN_CONFIRMATION

COMPLETED

FAILED

CANCELLED

EXPIRED


Do not force all domain processes into one generic enum if more specific states already exist.

Use appropriate domain-specific states where necessary.

========================================================
I. SMART MONEY CHECK ASYNC CONTRACT
========================================================

Smart Money Check must be designed for asynchronous backend execution.

Conceptual lifecycle:

CREATED
→ SCANNING
→ PARTIAL or COMPLETED
→ STALE

Possible failure:
FAILED


Individual scan sources have independent states.

Example:

walletAssets:
complete

pancakeSwap:
complete

venus:
running

marketContext:
queued

agentMatching:
queued


The frontend must be capable of rendering partial results while later scan stages continue.

Do not wait for every provider before showing valid information.

Do not implement the scan as a purely visual setTimeout sequence embedded inside the page component.

Mock behavior should live in a mock service/repository so real async backend events can replace it cleanly.

========================================================
J. SSE-READY / REALTIME EVENT CONTRACT
========================================================

Smart Money Check, activations, marketplace tests and some monitoring views should be architected so they can later consume Server-Sent Events or an equivalent realtime event stream.

Design hooks/services conceptually compatible with:

GET /v1/checks/:id/events

GET /v1/activations/:id/events

GET /v1/tests/:id/events


Possible event examples:

check.started

check.source.started

check.source.completed

check.source.failed

finding.created

check.completed


activation.authorization_requested

activation.permission_confirmed

activation.runtime_starting

activation.active

activation.failed


transaction.submitted

transaction.confirmed

transaction.failed


test.started

test.stage.completed

test.passed

test.failed


Frontend state should update incrementally.

Do not architect screens around manual page refresh.

Do not tightly bind the UI to polling-only behavior.

Mock realtime behavior may be simulated but must be isolated behind the data/service layer.

========================================================
K. SERVER-STATE HANDLING
========================================================

Treat backend/API data as server state.

Design components so they can later be powered cleanly by a server-state library such as TanStack Query.

Support conceptually:

query keys

loading

error

stale data

refetch

background refresh

mutation state

optimistic UI only where safe


Do NOT use optimistic UI for sensitive blockchain states unless the interface clearly represents them as pending.

For example:

After user clicks Revoke:

show:

REVOCATION PENDING

not:

REVOKED

until actual backend/onchain confirmation arrives.

========================================================
L. WALLET HANDLER CONTRACT
========================================================

Wallet interaction will later be implemented with real BSC/EVM wallet infrastructure.

Do not embed fake blockchain operations inside presentation components.

Use abstract handlers.

Examples:

connectWallet()

disconnectWallet()

verifyWalletOwnership()

signAuthenticationMessage()

requestPermission()

signTransaction()

switchNetwork()

revokePermission()


The actual implementation may later use libraries/providers such as:

wagmi

viem

wallet connectors

Altana

or other approved BSC wallet infrastructure.


Page components should call handlers/hooks.

They should not directly manipulate provider internals.

========================================================
M. WALLET OWNERSHIP STATES
========================================================

Keep these distinct:

WATCH_ONLY

CONNECTED

VERIFIED_CONTROL


Entering:

0x123...

into Smart Money Check creates a watch-only context.

It does NOT prove the current visitor controls that wallet.

Do not automatically show authority/activation actions that require ownership as though ownership has already been proven.

If activation requires control, guide the user to connect/verify an appropriate wallet.

========================================================
N. WALLET AUTHORIZATION UX CONTRACT
========================================================

The future backend will construct and validate expected authorization intent.

The frontend will present that intent and invoke the user’s wallet/session provider.

The frontend must never silently widen:

contracts

functions

assets

limits

expiry

or other authority fields.


The actual returned PermissionGrant must be reconciled after authorization.

Do not assume:

requested permission == granted permission.


Render the actual grant after confirmation.

========================================================
O. PERMISSION / ACTIVATION STATE INDEPENDENCE
========================================================

This separation is critical.

Do not model the UI with only:

agent.active = true/false


Example valid state:

PermissionGrant:
ACTIVE

Activation:
FAILED


The UI must display:

“Permission exists, but the agent is not active.”

Actions:

Retry Activation

Revoke Permission


Another possible state:

PermissionGrant:
REVOKED

Activation:
ACTION_REQUIRED or TERMINATED


Do not derive PermissionGrant.status from Activation.status.

Do not derive Activation.status from PermissionGrant.status.

Fetch/store/display both.

========================================================
P. TRANSACTION STATE SEPARATION
========================================================

A transaction has its own lifecycle.

Possible conceptual states:

PREPARED

AWAITING_SIGNATURE

SUBMITTED

INCLUDED

CONFIRMED

FINALIZED

FAILED

REVERTED

CANCELLED


Do not equate:

AgentAction.status = completed

with:

TransactionRecord.status = confirmed

unless backend evidence supports it.


A monitoring/alert AgentAction may have no TransactionRecord at all.

========================================================
Q. OUTCOME STATE SEPARATION
========================================================

Outcome measurement happens after actions/transactions and uses observation windows.

Do not immediately create financial success states when a transaction succeeds.

Example:

Rebalance transaction:
CONFIRMED

does NOT automatically mean:

Outcome:
PROFITABLE


Outcome states may include:

COLLECTING

MEASURED

FINALIZED

INSUFFICIENT_DATA

CONFOUNDED

INVALIDATED


Outcome metrics should come from normalized backend data.

Do not calculate complex financial performance ad hoc inside UI components.

========================================================
R. OUTCOME ATTRIBUTION CONTRACT
========================================================

Outcome metrics may carry attribution classes:

DIRECT

OBSERVED

DERIVED

COUNTERFACTUAL


Example:

Gas paid:
DIRECT

LP fees earned during management period:
OBSERVED

Net yield:
DERIVED

Estimated liquidation loss avoided:
COUNTERFACTUAL


The UI should preserve these distinctions where useful.

Do not style counterfactual estimates as direct observed results.

========================================================
S. NORMALIZED PROVIDER DATA
========================================================

The backend will normalize data from external providers.

The frontend should consume normalized marketplace resources.

Provider-specific details may still appear as metadata/evidence, but should not define component structures.


Examples:


BSC data becomes normalized:

AssetPosition

TransactionRecord

Wallet balance evidence


PancakeSwap data becomes:

LiquidityPositionSnapshot

MarketSnapshot

supported protocol/pool metadata


Venus data becomes:

LendingPositionSnapshot

health/risk evidence


ERC-8004 / 8004scan data becomes:

AgentIdentity

ExternalFeedbackRecord

identity evidence


Altana data becomes:

PermissionGrant

PermissionUsageSnapshot


BNB Agent Studio / ERC-8183 data becomes:

AgentService metadata

Activation/job state

ActivityEvent


Do not create a unique UI architecture for every provider.

Use marketplace-normalized objects.

========================================================
T. SOURCE / PROVENANCE METADATA
========================================================

Important normalized records should support source metadata.

Conceptually:

sourceType

sourceName

sourceRef

observedAt

freshnessState

provenance

confidence

methodVersion


UI components must be designed to render provenance without requiring knowledge of provider-specific response structures.

========================================================
U. FRESHNESS / STALE CONTRACT
========================================================

Do not treat cached data as permanently valid.

Resources should conceptually expose:

observedAt

freshnessState

and/or

staleAt


Frontend states include:

FRESH

AGING

STALE

UNAVAILABLE


A value may remain displayable while stale but not suitable for a new action.

Example:

Agent profile can display a slightly old historical metric.

Permission Checkout must refresh execution-sensitive state before activation.

Design for background refresh.

========================================================
V. READINESS CONTRACT
========================================================

Service readiness is a backend-derived resource.

It is NOT simply:

endpointOnline = true


Readiness may combine:

identity readiness

endpoint readiness

chain readiness

payment readiness

permission-profile readiness

required tests

recent execution readiness


Frontend receives a normalized readiness state such as:

READY

LIMITED

DEGRADED

OFFLINE

TESTNET_ONLY

SUSPENDED


Do not independently reconstruct readiness from arbitrary UI fields.

========================================================
W. FINDING CONTRACT
========================================================

Finding generation is performed by deterministic backend logic.

A Finding should arrive with structured data such as:

id

category

state

severity

confidence

headline

summary

subject

evidence

uncertainties

coverage

primaryAction

generatedAt

expiresAt


The frontend displays it.

Do not create new financial Findings inside React based on local conditionals against raw protocol data.

========================================================
X. RECOMMENDATION CONTRACT
========================================================

The backend determines:

candidate eligibility

hard-gate failures

ranking

match reasons

trade-offs


Frontend receives normalized recommendation candidates.

Conceptual candidate fields:

serviceId

eligibilityStatus

rank

highlightLabel

matchReasons[]

tradeoffs[]

failedConstraints[]


Do not use frontend AI or UI logic to reorder incompatible agents.

========================================================
Y. COMPARE CONTRACT
========================================================

Compare must reference real service IDs.

Do not copy service data into a disconnected comparison-only structure if avoidable.

Conceptually:

comparisonContext

serviceIds[]

category

comparisonMetrics[]


Category-specific rows should be generated from normalized metric definitions and evidence.

========================================================
Z. SMART MONEY PLAN CONTRACT
========================================================

Plan UI must distinguish:

SmartMoneyPlanTemplate

PlanRecommendation

PlanInstance


Template:
what the plan concept is.

Recommendation:
why this user/context should consider it and which agents were selected.

Instance:
the user’s actual active plan.


Member services remain individual resources.

Do not create:

plan.agent = combinedSuperAgent


Use:

plan.members[]

with:

role

service

activation

permission

status

========================================================
AA. CHECKOUT CONTRACT
========================================================

Checkout should be represented as a backend resource.

Conceptual structure:

checkoutId

walletId

serviceId or planRecommendationId

jobContext

quote

permissionRequest

riskDisclosure

status

expiresAt


Steps should render from this resource where possible.

Do not store the canonical checkout only in React local state.

Local form state is fine while editing, but backend persistence should be anticipated.

========================================================
AB. QUOTE CONTRACT
========================================================

Pricing can change.

Design for:

quote.status

quote.createdAt

quote.expiresAt

agentFee

protocolCosts

estimatedGas

performanceFee

totalEstimate

uncertainties


If quote expires:

show expired state.

Do not silently continue with old numbers.

========================================================
AC. ACTIVITY CONTRACT
========================================================

Activity timeline consumes normalized ActivityEvent objects.

Possible fields:

id

activationId

planId

eventType

severity

title

description

sourceType

sourceId

occurredAt


Event may optionally reference:

AgentAction

TransactionRecord

EvidenceRecord


Do not parse raw blockchain logs inside the ActivityTimeline component.

========================================================
AD. ALERT CONTRACT
========================================================

Alerts are distinct from ordinary activity.

Alert fields conceptually include:

id

type

severity

activationId

planId

title

description

status

createdAt

resolvedAt

actionType


Support:

OPEN

ACKNOWLEDGED

RESOLVED

DISMISSED


Do not treat all activity events as alerts.

========================================================
AE. OPERATOR WORKSPACE CONTRACT
========================================================

Operator pages should consume the same normalized marketplace entities where possible.

Operators edit:

listing information

services

pricing

permission profile declarations

runtime configuration

operator-supplied evidence


Operators must NOT directly edit:

marketplace-observed evidence

readiness snapshots

marketplace test outcomes

verified marketplace reviews

production outcomes


Frontend forms should reflect these ownership boundaries.

========================================================
AF. FORM PERSISTENCE
========================================================

Long operator/service configuration flows should support:

draft saving

validation

server-side errors

unsaved changes

resume later


Do not design operator creation as one giant local-only form whose state disappears on navigation.

========================================================
AG. API ERROR MODEL
========================================================

Design for structured backend errors.

Conceptually:

code

message

fieldErrors

recoverable

retryable

correlationId

details


UI should distinguish:

validation error

permission error

provider unavailable

network mismatch

quote expired

service unavailable

authorization rejected

transaction failed

insufficient evidence

unsupported position


Do not render every backend failure as:

“Something went wrong.”

========================================================
AH. CORRELATION / SUPPORT IDENTIFIERS
========================================================

For complex failures, support displaying a short reference/support ID derived from backend correlation IDs.

Examples:

Check reference

Activation reference

Transaction hash

Test run ID


Do not expose raw stack traces.

========================================================
AI. SECURITY BOUNDARIES
========================================================

Frontend must assume:

User wallet private keys never reach marketplace backend.

Marketplace/agent private signing keys never reach browser.

Agent private signing keys never appear in frontend mocks or code.

Never put real secrets, seed phrases, private keys or signing credentials in sample data.

Never create frontend code that requires hardcoded secrets.

========================================================
AJ. ENVIRONMENT AWARENESS
========================================================

Resources may belong to:

BSC Testnet

BSC Mainnet


Show environment when relevant.

Do not mix testnet evidence and mainnet production performance without labels.

Sample/demo data must be clearly identified separately from either.

========================================================
AK. EXAMPLE / MOCK MODE
========================================================

The Example Portfolio flow should use the same domain interfaces and repositories as live data.

Conceptually:

LiveRepository

and

ExampleRepository

should return compatible resource shapes.


Do not create a totally separate hardcoded Example Portfolio page.

The same:

Smart Money Check

Finding Cards

Recommendation screens

Agent Profiles

Compare

Plans

Checkout previews

should operate on example-domain data.

This makes later judge/demo mode maintainable.

========================================================
AL. API SWAPPABILITY REQUIREMENT
========================================================

A key quality goal is:

Replacing mock data with real API integration should primarily require changing:

repositories

API hooks

service adapters


It should NOT require redesigning:

page layouts

cards

finding structure

evidence components

compare

checkout

My Agents

Authority

Outcomes

Plans


Preserve this requirement throughout generated code.

========================================================
AM. COMPONENT PROP DESIGN
========================================================

Prefer focused props or domain/view-model objects.

Good:

<AgentCard
  service={service}
  readiness={readiness}
  evidenceSummary={evidenceSummary}
  context={context}
/>


Bad:

<AgentCard
  name="YieldPilot"
  apy="8.4%"
  status="green"
  description="..."
  badge1="..."
  badge2="..."
  ...
/>


Similarly:

<FindingCard finding={finding} />

is better than dozens of arbitrary visual string props when a stable domain object exists.

========================================================
AN. VIEW MODEL LAYER
========================================================

Where domain objects are too complex for visual components, create lightweight view-model selectors.

Example:

toAgentCardViewModel(service, evidence, context)

toFindingCardViewModel(finding)

toAuthorityViewModel(permissionGrant)

toOutcomeBreakdownViewModel(outcomeMetrics)


Keep transformation logic centralized.

Do not duplicate metric formatting/ranking logic across pages.

========================================================
AO. DATA FORMATTING
========================================================

Centralize financial formatting helpers.

Examples:

formatCurrency()

formatTokenAmount()

formatPercent()

formatDuration()

formatAddress()

formatFreshness()

formatEvidencePeriod()


Do not implement slightly different formatting in every component.

========================================================
AP. CLIENT-SIDE CALCULATION LIMITS
========================================================

Frontend may perform presentation calculations such as:

display percentages

layout calculations

simple totals supplied from normalized components


Frontend should NOT independently calculate canonical:

health factor

market regime

agent ranking

financial outcome

performance attribution

permission scope

Plan compatibility


Those belong to backend/domain logic.

If mock mode needs them, mock repository should return already-derived fields.

========================================================
AQ. ACTION HANDLER DESIGN
========================================================

Major UI actions must route through handlers/services.

Examples:

onRunSmartMoneyCheck

onCompareService

onStartCheckout

onAuthorize

onActivate

onPauseActivation

onResumeActivation

onRevokePermission

onSwitchAgent

onRunMarketplaceTest

onReplacePlanMember


Do not embed network/provider logic directly inside reusable cards.

========================================================
AR. IDEMPOTENCY / DOUBLE-SUBMISSION UX
========================================================

Sensitive actions may take time.

Prevent accidental duplicate actions.

Examples:

Authorize

Activate

Revoke

Run Test

Submit Operator Listing


While request is in progress:

disable or transform the primary action appropriately.

Show:

Authorizing…

Activating…

Revocation pending…

Do not let repeated taps create duplicate intents.

========================================================
AS. BLOCKCHAIN PENDING STATES
========================================================

A signed operation may remain pending.

Support explicit UI states:

Awaiting wallet confirmation

Submitted to BSC

Waiting for confirmation

Confirmed

Failed


Do not jump directly:

Authorize
→ Active

without representing important pending states where the backend exposes them.

========================================================
AT. PLAN MEMBER STATE SEPARATION
========================================================

In Smart Money Plans:

Each member has independent:

service status

permission status

activation status

runtime status


Plan state is derived separately.

Example:

YieldPilot:
ACTIVE

VenusGuard:
FAILED

Plan:
ACTIVATION_INCOMPLETE


Do not derive every member state from Plan status.

========================================================
AU. BACKEND-READY LOADING DESIGN
========================================================

Loading must support independently resolving resources.

Example Agent Profile:

Agent identity available

Service details available

Evidence loading

Tests loading

Readiness refreshing


Do not require one giant request to finish before rendering the page.

Use section-level skeletons where appropriate.

========================================================
AV. BACKEND-READY PARTIAL STATE DESIGN
========================================================

Example:

Agent Profile identity and service data loaded.

8004 external feedback failed.

Marketplace tests loaded.

Render profile.

Show External Reputation section as temporarily unavailable.

Do not fail entire page.


Same principle for:

Smart Money Check

Compare

Outcomes

Operator Workspace

========================================================
AW. BACKEND-READY INVALIDATION
========================================================

Sensitive actions should anticipate invalidating/refetching related data.

Example:

Revoke Permission

then update/refetch:

PermissionGrant

Activation

Authority overview

Active Agent detail

Plan status if relevant


Activate Service

then update:

Checkout

Permission

Activation

My Agents

Activity


The component architecture should make these linked updates possible.

========================================================
AX. ROUTE IDENTITY
========================================================

Use stable resource IDs in routing/navigation where appropriate.

Do not rely solely on array indexes or display names.

Examples:

agentSlug may be display-friendly

serviceId remains stable identity

activationId identifies exact user-service relationship

planInstanceId identifies exact active plan


Do not use:

/my-agents/yieldpilot

if the user could have multiple YieldPilot activations.

Use an activation identity.

========================================================
AY. PROVIDER-AGNOSTIC UI
========================================================

Although this product initially integrates:

BSC

PancakeSwap

Venus

ERC-8004

8004scan

Altana

BNB Agent Studio

ERC-8183

x402/B402


avoid baking provider names into reusable component names when the component is conceptually generic.

Good:

PermissionSummary

EvidenceDrawer

LiquidityPositionCard

LendingPositionCard


Avoid:

AltanaPermissionCard

VenusEvidenceDrawer


unless the component truly displays provider-specific functionality.

========================================================
AZ. DO NOT SIMPLIFY BACKEND-READY ARCHITECTURE
========================================================

Do NOT:

hardcode all mock data into page components

use setTimeout directly throughout UI to simulate the backend

make every operation synchronous

assume wallet connection means ownership verification

assume authorization means activation

assume activation means transaction success

assume transaction success means positive outcome

assume an active agent has active authority

assume revoked permission immediately means backend activation disappeared

calculate protocol health risk inside React

calculate recommendation ranking inside React

calculate complex financial outcomes inside React

query external providers from arbitrary UI components

mix raw provider response structures into presentation components

flatten all service/evidence/permission data into one Agent object

flatten all runtime information into a boolean “active”

flatten Plan members into a super-agent

store canonical checkout only in local component state

optimistically mark blockchain-sensitive actions successful before confirmation

place private keys or secrets in frontend code

design only around the happy-path response


Preserve the complete frontend/backend separation described here.

========================================================
BA. BACKEND FUSION SUCCESS CRITERIA
========================================================

The generated frontend architecture is successful if, after export, a software engineer can:

1. replace mock repositories with real typed API repositories;

2. connect server-state hooks;

3. connect SSE/event streams;

4. connect a real BSC wallet;

5. connect real permission authorization;

6. consume real Agent/Service/Finding/Evidence/Activation/Outcome resources;

7. preserve all existing visual components;

8. preserve all existing routes and primary interactions;

9. remove sample data without rewriting screens;

10. maintain independent states for:

   agent service
   readiness
   evidence
   checkout
   permission
   activation
   action
   transaction
   outcome
   Smart Money Plan member;

11. progressively load partial backend resources;

12. display real provider-backed provenance without changing component architecture.

Design and code with this future fusion as a hard requirement.

========================================================
BB. FINAL BACKEND INTEGRATION RULE
========================================================

The frontend is a PRESENTATION AND INTERACTION LAYER over a structured financial marketplace domain.

Do not let convenience during prototyping destroy those domain boundaries.

Mock the backend.

Do not mock away the architecture.

Generate the UI so the prototype is visually complete today and technically ready to become the real frontend tomorrow.

========================================================
85. FINAL QUALITY BAR
========================================================

The final result should feel like:

A serious financial marketplace

A trustworthy autonomous-agent control surface

A premium BSC product

A product sophisticated traders can inspect

A product first-time users can understand

A product BNB could plausibly use as the front door to financial agents

The interface should communicate:

“I understand what is happening.”

“I understand why this agent fits.”

“I can inspect the evidence.”

“I know what I am authorizing.”

“I can see what the agent is doing.”

“I can revoke it.”

“I can measure whether it helped.”

That feeling is more important than visual novelty.



========================================================
86. FINAL GENERATION INSTRUCTION
========================================================

Build the complete cohesive product system described above.

Do not reduce the request to a few marketing screens.

Do not omit important post-activation states.

Do not collapse the four categories.

Do not simplify evidence or permissions into generic badges.

Do not remove failure/partial/stale/empty states.

Do not redesign this as a generic AI chatbot.

Do not redesign it as an NFT/Web3 marketplace.

Do not redesign it as an enterprise sidebar dashboard.

Preserve the architecture, but make the UI feel remarkably simple.

Use progressive disclosure:

Simple decision surface first.
Explanations second.
Deep technical evidence underneath.

Create a polished, responsive, reusable frontend design system and all primary screens necessary to represent the complete BSC financial-agent marketplace.

The generated prototype must be backend-fusion-ready. Keep all sample behavior behind mock repositories/services, keep asynchronous workflows stateful and replaceable, preserve distinct domain identities for services, permissions, activations, transactions and outcomes, and ensure no major screen needs to be redesigned when mock data is replaced with the real marketplace API.