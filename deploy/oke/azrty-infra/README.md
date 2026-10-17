# Promptforge on OKE — azrty-infra bundle

These files belong in **azrty-infra** (they own the namespace, RBAC, database,
secrets and the gateway listener). Move them as noted, then create the secrets.

| File                             | Destination in azrty-infra                                  |
| -------------------------------- | ----------------------------------------------------------- |
| `tenant.yaml`                    | `platform/tenants/promptforge/tenant.yaml`                  |
| `postgres.yaml`                  | `platform/tenants/promptforge/postgres.yaml`                |
| `tenant-promptforge.app.yaml`    | `platform/apps/tenant-promptforge.yaml`                     |
| `gateway-certificate.yaml`       | paste into `platform/gateway/gateway.yaml` (with the other Certificates) |

## 1. Gateway listener + certificate

The certificate object is in `gateway-certificate.yaml`. Add the matching listener
to the `edge` Gateway (`platform/gateway/gateway.yaml`, `spec.listeners`):

```yaml
  - name: promptforge-directory
    protocol: HTTPS
    port: 443
    hostname: promptforge.directory
    tls:
      mode: Terminate
      certificateRefs:
      - {kind: Secret, name: promptforge-directory-tls}
    allowedRoutes:
      namespaces:
        from: Selector
        selector:
          matchLabels: {kubernetes.io/metadata.name: promptforge}
```

ExternalDNS on OKE is filtered to `azrty.com` (`--domain-filter=azrty.com`), so it
will **not** manage `promptforge.directory`. The domain currently points at the
live AWS deployment; the cutover to the OKE load balancer is a manual DNS change.

## 2. SOPS secrets (create in `platform/tenants/promptforge/`)

All secrets are SOPS-encrypted with the `kuvryn-sync-sops` key (same as the other
tenants). Create each with `sops` after copying a sibling tenant's file as a template:

| Secret                    | Type                              | Keys                                                                 |
| ------------------------- | --------------------------------- | -------------------------------------------------------------------- |
| `promptforge-sync-git`    | `Opaque`                          | git credentials for Kuvryn Sync pulling `azrtydxb/Promptforge`        |
| `ghcr-pull`               | `kubernetes.io/dockerconfigjson`  | `.dockerconfigjson` for `ghcr.io` (omit if the package is public)     |
| `promptforge-env`         | `Opaque`                          | `NEXTAUTH_SECRET`, `NEXTAUTH_URL=https://promptforge.directory`, `NEXT_PUBLIC_APP_URL`, plus SMTP/OAuth/provider keys as needed |
| `pg-backup-credentials`   | `Opaque`                          | `ACCESS_KEY_ID`, `ACCESS_SECRET_KEY`, `REGION` (OCI Object Storage)   |

The database URL comes from CNPG: `promptforge-pg-app` (key `uri`) is created
automatically by the `promptforge-pg` Cluster.

Generate `NEXTAUTH_SECRET` with `openssl rand -base64 32`.

## 3. Register and sync

Merging `platform/apps/tenant-promptforge.yaml` + `platform/tenants/promptforge/`
to `azrty-infra` `main` lets the platform sync create the tenant; Kuvryn then
deploys `deploy/kuvryn-sync/oke` from the Promptforge repo. Confirm with:

```bash
kubectl -n kuvryn-platform get applications.sync.kuvryn.io tenant-promptforge
kubectl -n promptforge get applications.sync.kuvryn.io promptforge
kubectl -n promptforge get pods
```

## Notes / decisions to confirm

- **Hostname**: `promptforge.directory` (already live on AWS); change
  `httproute.yaml` (app repo), the listener and the certificate if different.
- **Cutover**: OKE will not take over DNS automatically (external-dns is
  filtered to azrty.com); point the A record at the OKE LB when ready.
- **Coexistence**: this runs alongside ECS; `deploy.yml` (ECR/ECS) is untouched.
- **Schema**: apply out-of-band (see the app repo `docs/deploy-oke.md`).
