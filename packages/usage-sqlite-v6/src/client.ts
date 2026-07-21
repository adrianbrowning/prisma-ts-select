import { loadEnvFile } from "node:process";
import { PrismaClient } from "../generated/prisma/index.js";
import tsSelectExtend from "../generated/prisma-ts-select/extend-v6.js";

loadEnvFile(".env");

export const prisma = new PrismaClient().$extends(tsSelectExtend);
