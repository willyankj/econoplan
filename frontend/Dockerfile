# Use an official Node.js runtime as a parent image
FROM node:20-alpine

# Arguments that can be passed during the build
ARG NEXT_PUBLIC_API_URL

# Environment variables
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install any needed packages
RUN npm install

# Bundle app source
COPY . .

# Make port ${PORT} available to the world outside this container
EXPOSE ${PORT}

# Define the command to run the app
CMD [ "npm", "run", "dev" ]
