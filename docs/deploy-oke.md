# Deploying Promptforge on OKE

Promptforge runs on OKE (Oracle Kubernetes Engine, ARM64 nodes). The former AWS ECS
deployment (and its `deploy.yml` workflow) is retired.

|              | OKE                                                                                                     |
| ------------ | ------------------------------------------------------------------------------------------------------- |
| Public URL   | https://promptforge.directory                                                                            |
| Image        | OCIR `dxb.ocir.io/axmcgpqk0w0z/azrty/promptforge`, linux/arm64 cross-compiled from `Dockerfile.oke` (no QEMU), `.github/workflows/oke-image.yml` pins the digest through an auto-merging PR |
| Sign-in      | Zitadel at login.azrty.com; the client is written to secret `promptforge-oidc` by azrty-infra's zitadel-config |
| Manifests | `deploy/kuvryn-sync/oke/` (Kuvryn Sync applies them) |
| Database | CloudNativePG `promptforge-pg` (secret `promptforge-pg-app`, key `uri`) |
| Secrets | SOPS-managed secrets in `azrty-infra/platform/tenants/promptforge/` |
| GitOps | Kuvryn Sync `Repository` + `Application` (`azrty-infra/platform/tenants/promptforge/tenant.yaml`) |

## Runtime

- Port **3000** (`PORT`), health endpoint **`GET /api/health`** → used for the
  startup, readiness and liveness probes.
- Image: `gcr.io/distroless/nodejs20-debian12` running Next.js standalone
  (`node server.js`), files owned by uid/gid 1000; the pod sets `runAsNonRoot`.
- **1 replica**, default rolling update (stateless), PDB `maxUnavailable: 1` (`minAvailable: 1` on a single replica blocks node drains).

## Applying the database schema

The container does not apply the schema at start. Apply it out-of-band, e.g.:

```bash
kubectl -n promptforge run psql --rm -i --restart=Never --image=postgres:16 \
  --env="DATABASE_URL=$(kubectl -n promptforge get secret promptforge-pg-app -o jsonpath='{.data.uri}' | base64 -d)" \
  -- sh -c 'npx prisma db push --schema=prisma/schema.prisma'  # or a raw SQL file
```

The mockup seed can be run the same way with the builder image
(`docker build --target builder -f Dockerfile.oke`), when needed.

## What lives where

- **This repo** owns its workloads: `deploy/kuvryn-sync/oke/{deployment,service,httproute}.yaml`.
- **azrty-infra** owns the namespace, RBAC, database, secrets and the gateway
  listener/certificate: see `deploy/oke/azrty-infra/` (ready-to-move bundle).

## Go-live checklist

1. The image workflow needs the repository secrets `OCIR_USERNAME`, `OCIR_TOKEN` and `SYNC_TOKEN`; the
   namespace needs the `ocir-pull` secret (azrty-infra).
2. Merge `deploy/kuvryn-sync/oke/` to `main`; the **OKE image** workflow builds the
   arm64 image and pins its digest in `deployment.yaml`.
3. Move `deploy/oke/azrty-infra/*` into `azrty-infra` (`platform/tenants/promptforge/`
   + `platform/apps/tenant-promptforge.yaml`) and add the gateway listener.
4. Create the SOPS secrets (see `deploy/oke/azrty-infra/README.md`).
5. Merge the azrty-infra change; the platform sync creates the tenant and Kuvryn
   deploys Promptforge.
