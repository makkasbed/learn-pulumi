import * as pulumi from "@pulumi/pulumi";
import * as docker from "@pulumi/docker";

//load configuration
const config = new pulumi.Config();
const frontendPort = config.requireNumber("frontendPort");
const backendPort = config.requireNumber("backendPort");
const mongoPort = config.requireNumber("mongoPort");
const mongoHost = config.require("mongoHost");
const database = config.require("database");
const nodeEnvironment = config.require("nodeEnvironment");
const protocol = config.require("protocol");

const stack = pulumi.getStack();

//pull the backend image
const backendImageName = "backend";
const backend = new docker.RemoteImage(`${backendImageName}Image`,{
    name: "pulumi/tutorial-pulumi-fundamentals-backend:latest"
})

//pull the frontend image
const frontendImageName = "frontend";
const frontend = new docker.RemoteImage(`${frontendImageName}Image`,{
    name: "pulumi/tutorial-pulumi-fundamentals-frontend:latest"
});

//pull the mongodb image
const mongoImage = new docker.RemoteImage("mongoImage",{
    name: "pulumi/tutorial-pulumi-fundamentals-database-local:latest"
});

//create a docker network
const network = new docker.Network("network",{
    name:`services-${stack}`
});

//create mongodb container
const mongoContainer = new docker.Container("mongoContainer",{
    name: `mongo-${stack}`,
    image: mongoImage.repoDigest,
    ports: [
        {
            internal: mongoPort,
            external: mongoPort
        }
    ],
    
    networksAdvanced: [
        {
            name: network.name,
            aliases:["mongo"]
        }
    ]
})

//create backend container
const backendContainer = new docker.Container("backendContainer",{
    name: `backend-${stack}`,
    image: backend.repoDigest,
    ports: [
        {
            internal: backendPort,
            external: backendPort
        }
    ],
    envs:[
        `DATABASE_HOST=${mongoHost}`,
        `DATABASE_NAME=${database}`,
        `NODE_ENV=${nodeEnvironment}`
    ],
    networksAdvanced: [
        {
            name: network.name
        }
    ]
},{dependsOn:[mongoContainer]});

//create the frontend container
const frontendContainer = new docker.Container("frontendContainer",{
    name: `frontend-${stack}`,
    image: frontend.repoDigest,
    ports: [
        {
            internal: frontendPort,
            external: frontendPort
        }
    ],
    envs:[
        `PORT=${frontendPort}`,
        `HTTP_PROXY=backend-${stack}:${backendPort}`,
        `PROXY_PROTOCOL=${protocol}`
    ],
    
    networksAdvanced: [
        {
            name: network.name,
        }
    ]
})

