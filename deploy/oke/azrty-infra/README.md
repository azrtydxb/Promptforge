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
  - name: promptforge-azrty-com
    protocol: HTTPS
    port: 443
    hostname: promptforge.azrty.com
    tls:
      mode: Terminate
      certificateRefs:
      - {kind: Secret, name: promptforge-azrty-com-tls}
    allowedRoutes:
      namespaces:
        from: Selector
        selector:
          matchLabels: {kubernetes.io/metadata.name: promptforge}
```

ExternalDNS only creates A records for allow-listed names (`oci/route53-access`,
`external_dns_names`). Add `promptforge.azrty.com` there (OpenTofu apply) or the
record will not appear.

## 2. SOPS secrets (create in `platform/tenants/promptforge/`)

All secrets are SOPS-encrypted with the `kuvryn-sync-sops` key (same as the other
tenants). Create each with `sops` after copying a sibling tenant's file as a template:

| Secret                    | Type                              | Keys                                                                 |
| ------------------------- | --------------------------------- | -------------------------------------------------------------------- |
| `promptforge-sync-git`    | `Opaque`                          | git credentials for Kuvryn Sync pulling `azrtydxb/Promptforge`        |
| `ocir-pull`               | `kubernetes.io/dockerconfigjson`  | `.dockerconfigjson` for `dxb.ocir.io`                                |
| `promptforge-env`         | `Opaque`                          | `NEXTAUTH_SECRET`, `NEXTAUTH_URL=https://promptforge.azrty.com`, `NEXT_PUBLIC_APP_URL`, plus SMTP/OAuth/provider keys as needed |
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

- **Hostname**: assumed `promptforge.azrty.com`; change `httproute.yaml` (app repo),
  the listener, the certificate and the ExternalDNS allowlist if different.
- **Coexistence**: this runs alongside ECS; `deploy.yml` (ECR/ECS) is untouched.
- **Schema**: apply out-of-band (see the app repo `docs/deploy-oke.md`).
