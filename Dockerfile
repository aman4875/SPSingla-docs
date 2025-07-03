FROM node:18

# Install system libraries required by `canvas`
RUN apt-get update && apt-get install -y \
    build-essential \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    && rm -rf /var/lib/apt/lists/*

RUN npm install -g nodemon

# Set working directory
WORKDIR /app

# Install only inside container
COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "run","dev"]
