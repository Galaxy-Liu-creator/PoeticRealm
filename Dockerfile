FROM node:24-alpine AS frontend-build
WORKDIR /build/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

FROM nginx:stable-alpine AS frontend
COPY deploy/nginx.conf /etc/nginx/nginx.conf
COPY --from=frontend-build /build/frontend/dist /usr/share/nginx/html
USER nginx
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=6 CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
ENTRYPOINT ["nginx", "-g", "daemon off;"]

FROM maven:3.9-eclipse-temurin-21 AS backend-build
WORKDIR /build/backend
COPY backend/pom.xml backend/mvnw ./
COPY backend/.mvn ./.mvn
RUN chmod +x mvnw && ./mvnw -B dependency:go-offline
COPY backend/src ./src
RUN ./mvnw -B package

FROM eclipse-temurin:21-jre-alpine AS backend
WORKDIR /app
COPY --from=backend-build /build/backend/target/backend-0.0.1-SNAPSHOT.jar app.jar
USER 10001:10001
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=4s --start-period=60s --retries=12 CMD wget -q -O /dev/null http://127.0.0.1:8080/actuator/health || exit 1
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
