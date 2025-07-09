# Use the official Long-Term Support (LTS) version of Node.js
FROM node:lts-alpine

# Tell Docker to run subsequent commands as the root user.
# This solves the permission issue for bind mounts during development.
USER root

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install project dependencies
RUN npm install

# Copy the rest of your application's source code
COPY . .

# The command to run when the container starts
CMD [ "npm", "run", "dev" ]