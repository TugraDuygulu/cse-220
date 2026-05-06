# Align restaurant-scoped review threads

Type: AFK

User stories covered: 9, 10, 11, 12, 19, 20, 21, 31, 32, 38, 39

## Parent

`docs/DISCOVERY_REVIEW_PRD.md`

## What to build

Create one consistent restaurant-scoped review thread contract that the frontend can use when a restaurant
is selected. The contract should return top-level reviews, one-level comments, highlighted owner answers,
reaction counts, and pagination metadata in a shape that can be normalized for review UI rendering.

## Acceptance criteria

- [ ] Restaurant-scoped review listing works through one agreed API contract used by the frontend.
- [ ] The response includes top-level reviews and their one-level replies/comments.
- [ ] The response distinguishes official business answers from normal user comments.
- [ ] Review pagination metadata is returned for selected restaurant review lists.
- [ ] Frontend review normalization handles empty reviews, missing optional fields, user comments, and business answers.
- [ ] Backend tests cover listing, serialization, route alignment, pagination, and owner-answer distinction.
- [ ] Frontend utility tests cover review thread normalization behavior.

## Blocked by

None - can start immediately.
