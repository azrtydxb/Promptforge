# Deploying Promptforge on OKE

Promptforge runs on OKE (Oracle Kubernetes Engine, ARM64 nodes) alongside the
existing AWS ECS deployment. The same image and code serve both.

|              | ECS                                                         | OKE                                                                                                     |
| ------------ | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Public URL   | (ECS ALB)                                                   | https://promptforge.azrty.com                                                                           |
| Image        | ECR `promptforge`, amd64, `.github/workflows/deploy.yml`    | OCIR `dxb.ocir.io/axmcgpqk0w0z/azrty/promptforge`, amd64 + arm64, `.github/workflows/oke-image.yml`       |
| Manifests    | (ECS task definition)                                       | `deploy/kuvryn-sync/oke/` (Kuvryn Sync applies them)                                                     |
| Database     | AWS RDS                                                     | CloudNativePG `promptforge-pg` (secret `promptforge-pg-app`, key `uri`)                                  |
| Secrets      | AWS Secrets Manager                                         | SOPS-managed secrets in `azrty-infra/platform/tenants/promptforge/`                                      |
| GitOps       | —                                                           | Kuvryn Sync `Repository` + `Application` (`azrty-infra/platform/tenants/promptforge/tenant.yaml`)        |

## Runtime

- Port **3000** (`PORT`), health endpoint **`GET /api/health`** → used for the
  startup, readiness and liveness probes.
- Image: `gcr.io/distroless/nodejs20-debian12` running Next.js standalone
  (`node server.js`), files owned by uid/gid 1000; the pod sets `runAsNonRoot`.
- **2 replicas**, default rolling update (stateless), PDB `minAvailable: 1`.

## Applying the database schema

The container does not apply the schema at start. Apply it out-of-band, e.g.:

```bash
kubectl -n promptforge run psql --rm -i --restart=Never --image=postgres:16 \
  --env="DATABASE_URL=$(kubectl -n promptforge get secret promptforge-pg-app -o jsonpath='{.data.uri}' | base64 -d)" \
  -- sh -c 'npx prisma db push --schema=prisma/schema.prisma'  # or a raw SQL file
```

The mockup seed can be run the same way with the builder image
(`dxb.ocir.io/axmcgpqk0w0z/azrty/promptforge:migrate`), tag `migrate` when needed.

## What lives where

- **This repo** owns its workloads: `deploy/kuvryn-sync/oke/{deployment,service,httproute}.yaml`.
- **azrty-infra** owns the namespace, RBAC, database, secrets and the gateway
  listener/certificate: see `deploy/oke/azrty-infra/` (ready-to-move bundle).

## Go-live checklist

1. Add GitHub repo secrets `OCIR_USERNAME` / `OCIR_TOKEN` (OCIR push auth).
2. Merge `deploy/kuvryn-sync/oke/` to `main`; the **OKE image** workflow builds the
   multi-arch image and pins its digest in `deployment.yaml`.
3. Move `deploy/oke/azrty-infra/*` into `azrty-infra` (`platform/tenants/promptforge/`
   + `platform/apps/tenant-promptforge.yaml`) and add the gateway listener.
4. Create the SOPS secrets (see `deploy/oke/azrty-infra/README.md`).
5. Merge the azrty-infra change; the platform sync creates the tenant and Kuvryn
   deploys Promptforge.
