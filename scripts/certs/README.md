# Supabase production certificate authorities

Public CA certificates from the official Supabase CLI repository at commit `f01410ec6ad5624a9aa8b7c1be8f7b2977c37f05`:

- https://github.com/supabase/cli/blob/f01410ec6ad5624a9aa8b7c1be8f7b2977c37f05/apps/cli-go/internal/gen/types/templates/prod-ca-2021.crt
- https://github.com/supabase/cli/blob/f01410ec6ad5624a9aa8b7c1be8f7b2977c37f05/apps/cli-go/internal/gen/types/templates/prod-ca-2025.crt

Used by the Lola PostgreSQL migration and runtime clients. Certificate-chain and hostname verification remain enabled. These are public CA certificates, not private keys.
