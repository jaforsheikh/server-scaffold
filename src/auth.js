import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { database, mongoClient } from "./db.js";

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:5000",
  secret: process.env.BETTER_AUTH_SECRET,

  database: mongodbAdapter(database, {
    client: mongoClient,
  }),

  trustedOrigins: [process.env.CLIENT_URL || "http://localhost:5173"],

  emailAndPassword: {
    enabled: true,
  },

  user: {
    additionalFields: {
      avatar: {
        type: "string",
        required: false,
        defaultValue: "",
      },
      bloodGroup: {
        type: "string",
        required: false,
        defaultValue: "",
      },
      district: {
        type: "string",
        required: false,
        defaultValue: "",
      },
      upazila: {
        type: "string",
        required: false,
        defaultValue: "",
      },
      role: {
        type: "string",
        required: false,
        defaultValue: "donor",
        input: false,
      },
      status: {
        type: "string",
        required: false,
        defaultValue: "active",
        input: false,
      },
    },
  },
});