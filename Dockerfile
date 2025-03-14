# Use the official Ubuntu 20.04 image as a base
FROM ubuntu:20.04

# Set the working directory inside the container
WORKDIR /app

# Set non-interactive mode to avoid prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive

# Install essential dependencies and tools
RUN apt-get update && apt-get install -y \
    curl \
    build-essential \
    python3 \
    libgtk-3-0 \
    libx11-dev \
    libnotify-dev \
    libgdk-pixbuf2.0-dev \
    libnspr4-dev \
    libnss3-dev \
    libxss1 \
    libasound2

# Install Node.js (latest LTS version)
RUN curl -fsSL https://deb.nodesource.com/setup_lts.x | bash - && \
    apt-get install -y nodejs

# Copy the package.json and package-lock.json first to leverage Docker cache
COPY ./package.json ./package-lock.json ./

# Install app dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the production dependencies for your app (optional but recommended)
RUN npm run build_front

# Define the volume to store the build output
VOLUME ["/app/ubuntu_build"]

# Set environment variable to specify the output directory for Electron Forge
ENV ELECTRON_BUILDER_OUTPUT=/app/ubuntu_build

# Build the Electron app using Electron Forge
RUN npm run build_deb

# Set the final command to run after the image is built (if you need to start it)
CMD ["npm", "run", "build_deb"]
