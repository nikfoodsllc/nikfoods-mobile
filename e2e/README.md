# End to end tests (Maestro)

Run against the iPhone simulator with Metro running (`npx expo start`) and the dev site (the default).
`maestro test e2e/login.yaml -e TEST_PASSWORD=<the dev test account password>` (the account is in the local test-accounts file).
Tests never touch the live site: the dev build points at livesite-dev and the Stripe test key.
