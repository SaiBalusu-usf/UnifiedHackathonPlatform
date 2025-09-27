# Unified Hackathon Platform - Google Cloud Deployment Guide

This guide provides step-by-step instructions for deploying the Unified Hackathon Platform to Google Cloud Platform (GCP). It covers setting up the necessary GCP services, deploying the microservices and frontend to Google Kubernetes Engine (GKE), configuring databases, and establishing monitoring and logging.

## 1. Prerequisites

Before you begin, ensure you have the following:

-   **Google Cloud Account**: An active GCP account with billing enabled.
-   **`gcloud` CLI**: The Google Cloud SDK installed and authenticated (`gcloud auth login`, `gcloud config set project [YOUR_PROJECT_ID]`).
-   **`kubectl` CLI**: Kubernetes command-line tool installed (`gcloud components install kubectl`).
-   **`helm` CLI**: Helm package manager installed (optional, but recommended for managing Kubernetes applications).
-   **Docker**: Docker installed on your local machine.
-   **Source Code**: The Unified Hackathon Platform source code cloned to your local machine.

## 2. GCP Project Setup

1.  **Create a new GCP Project**: If you don't have one, create a new project:
    ```bash
    gcloud projects create [YOUR_PROJECT_ID] --name="Unified Hackathon Platform"
    gcloud config set project [YOUR_PROJECT_ID]
    ```

2.  **Enable Required APIs**: Enable the necessary GCP APIs for Kubernetes, Container Registry, Cloud SQL, and others:
    ```bash
    gcloud services enable \
        container.googleapis.com \
        containerregistry.googleapis.com \
        sqladmin.googleapis.com \
        redis.googleapis.com \
        compute.googleapis.com \
        cloudbuild.googleapis.com \
        logging.googleapis.com \
        monitoring.googleapis.com
    ```

## 3. Google Container Registry (GCR) Setup

We will use GCR to store our Docker images. Authenticate Docker to GCR:

```bash
gcloud auth configure-docker
```

## 4. Build and Push Docker Images

Navigate to the root of your `unified-hackathon-platform` directory. Build and push the backend and frontend Docker images to GCR.

```bash
# Set your GCP project ID and desired image tag
export GCP_PROJECT_ID="[YOUR_PROJECT_ID]"
export IMAGE_TAG="latest"

# Build and push backend image
docker build -t gcr.io/${GCP_PROJECT_ID}/unified-hackathon-backend:${IMAGE_TAG} ./backend
docker push gcr.io/${GCP_PROJECT_ID}/unified-hackathon-backend:${IMAGE_TAG}

# Build and push frontend image
docker build -t gcr.io/${GCP_PROJECT_ID}/unified-hackathon-frontend:${IMAGE_TAG} ./frontend
docker push gcr.io/${GCP_PROJECT_ID}/unified-hackathon-frontend:${IMAGE_TAG}
```

## 5. Database Setup

### 5.1. PostgreSQL (Cloud SQL)

1.  **Create a Cloud SQL for PostgreSQL instance**:
    ```bash
    gcloud sql instances create unified-hackathon-postgres \
        --database-version=POSTGRES_14 \
        --region=[YOUR_GCP_REGION] \
        --tier=db-f1-micro \
        --root-password=[YOUR_POSTGRES_ROOT_PASSWORD]
    ```

2.  **Create a database and user**:
    ```bash
    gcloud sql databases create unified_hackathon_dev --instance=unified-hackathon-postgres
    gcloud sql users create unified_hackathon_user --instance=unified-hackathon-postgres \
        --password=[YOUR_POSTGRES_USER_PASSWORD]
    ```

3.  **Configure network access**: Allow your GKE cluster to connect to Cloud SQL. This typically involves configuring private IP or authorized networks.

### 5.2. MongoDB (MongoDB Atlas or Self-Hosted)

For simplicity, we recommend using MongoDB Atlas (a managed service). Alternatively, you can self-host MongoDB on a Compute Engine instance.

#### Option A: MongoDB Atlas (Recommended)

1.  Create a free-tier cluster on [MongoDB Atlas](https://cloud.mongodb.com/).
2.  Create a database user and note down the connection string.
3.  Configure network access to allow connections from your GKE cluster's public IP or VPC network.

#### Option B: Self-Hosted MongoDB on GCE

1.  Create a Compute Engine instance.
2.  Install MongoDB on the instance.
3.  Configure firewall rules to allow access from your GKE cluster.

## 5.3. Redis (Memorystore for Redis)

1.  **Create a Memorystore for Redis instance**:
    ```bash
    gcloud redis instances create unified-hackathon-redis \
        --region=[YOUR_GCP_REGION] \
        --size=1 \
        --tier=basic \
        --connect-mode=DIRECT_PEERING \
        --network=default \
        --project=[YOUR_PROJECT_ID]
    ```

2.  Note down the Redis instance IP address and port.

## 6. Google Kubernetes Engine (GKE) Setup

1.  **Create a GKE cluster**:
    ```bash
    gcloud container clusters create unified-hackathon-cluster \
        --zone=[YOUR_GCP_ZONE] \
        --num-nodes=3 \
        --machine-type=e2-medium \
        --enable-autoscaling --min-nodes=1 --max-nodes=5 \
        --enable-stackdriver-kubernetes
    ```

2.  **Get cluster credentials**:
    ```bash
    gcloud container clusters get-credentials unified-hackathon-cluster --zone=[YOUR_GCP_ZONE]
    ```

3.  **Create Kubernetes Namespace**:
    ```bash
    kubectl create namespace unified-hackathon
    ```

## 7. Kubernetes Deployment

### 7.1. Configure Secrets

Create Kubernetes secrets for your database credentials, JWT secrets, and API keys. Replace placeholders with your actual values.

```bash
kubectl create secret generic unified-hackathon-secrets -n unified-hackathon \
    --from-literal=POSTGRES_PASSWORD="[YOUR_POSTGRES_USER_PASSWORD]" \
    --from-literal=MONGODB_URI="[YOUR_MONGODB_CONNECTION_STRING]" \
    --from-literal=REDIS_PASSWORD="[YOUR_REDIS_PASSWORD]" \
    --from-literal=JWT_SECRET="[YOUR_JWT_SECRET]" \
    --from-literal=JWT_REFRESH_SECRET="[YOUR_JWT_REFRESH_SECRET]" \
    --from-literal=OPENAI_API_KEY="[YOUR_OPENAI_API_KEY]" \
    --from-literal=GOOGLE_CLIENT_ID="[YOUR_GOOGLE_CLIENT_ID]" \
    --from-literal=GOOGLE_CLIENT_SECRET="[YOUR_GOOGLE_CLIENT_SECRET]" \
    --from-literal=GITHUB_CLIENT_ID="[YOUR_GITHUB_CLIENT_ID]" \
    --from-literal=GITHUB_CLIENT_SECRET="[YOUR_GITHUB_CLIENT_SECRET]" \
    --from-literal=LINKEDIN_CLIENT_ID="[YOUR_LINKEDIN_CLIENT_ID]" \
    --from-literal=LINKEDIN_CLIENT_SECRET="[YOUR_LINKEDIN_CLIENT_SECRET]"
```

### 7.2. Update Kubernetes Manifests

Edit the Kubernetes manifest files (e.g., `k8s/backend-deployment.yaml`, `k8s/frontend-deployment.yaml`, `k8s/ingress.yaml`) to reflect your GCR image paths and any specific configurations (e.g., resource limits, environment variables).

Ensure that the image names in your deployment YAMLs match the GCR paths you pushed to:

```yaml
# Example for backend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: unified-hackathon-backend
  namespace: unified-hackathon
spec:
  template:
    spec:
      containers:
      - name: backend
        image: gcr.io/[YOUR_PROJECT_ID]/unified-hackathon-backend:[IMAGE_TAG]
        envFrom:
        - secretRef:
            name: unified-hackathon-secrets
        # ... other environment variables and configurations
```

### 7.3. Deploy to GKE

Apply all Kubernetes manifests:

```bash
kubectl apply -f k8s/ -n unified-hackathon
```

## 8. Networking and Ingress

1.  **Configure Ingress**: The `k8s/ingress.yaml` file defines how external traffic is routed to your services. Ensure it's configured correctly for your domain.

2.  **DNS Setup**: Update your domain's DNS records to point to the external IP address of the GKE Ingress controller.

## 9. Monitoring and Logging

-   **Cloud Monitoring**: GKE is integrated with Cloud Monitoring (formerly Stackdriver Monitoring). You can view cluster metrics, pod health, and set up alerts directly from the GCP Console.
-   **Cloud Logging**: All container logs are automatically sent to Cloud Logging (formerly Stackdriver Logging). You can use the Logs Explorer to filter and analyze logs.

## 10. Continuous Integration/Continuous Deployment (CI/CD)

For automated deployments, consider setting up a CI/CD pipeline using:

-   **Cloud Build**: To automate building Docker images and pushing to GCR.
-   **Cloud Deploy**: For managing releases and deploying to GKE.
-   **GitHub Actions / GitLab CI**: Integrate with your source code repository for automated testing and deployment.

## 11. Post-Deployment Steps

-   **Access the Platform**: Once Ingress and DNS are configured, access your platform via your custom domain.
-   **Run Database Migrations**: If your backend requires database migrations, ensure they are run as part of your deployment process (e.g., as an init container or a separate Kubernetes Job).
-   **Seed Initial Data**: If necessary, run scripts to seed initial data into your databases.
-   **Monitor Performance**: Use Cloud Monitoring and Cloud Logging to keep an eye on your application's performance and health.

This guide provides a high-level overview. Refer to the specific Kubernetes manifest files and your application's `README.md` for more detailed configuration options.

