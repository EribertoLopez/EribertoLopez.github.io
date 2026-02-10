import { DataSource } from "typeorm";
import { migrations } from "../migrations";
import { SnakeNamingStrategy } from "typeorm-naming-strategies";

// Explicit entity list for bundled Lambda environments
// Add entities here as they are created
const entities: any[] = [];

export const DatabaseServiceType = Symbol.for("DatabaseService");

let cachedDataSource: DataSource | null = null;

export class DatabaseService {
  async closeConnections() {
    if (cachedDataSource?.isInitialized) {
      await cachedDataSource.destroy();
      cachedDataSource = null;
    }
  }

  async getDataSource(): Promise<DataSource> {
    if (cachedDataSource?.isInitialized) {
      return cachedDataSource;
    }
    const config = this.getConnectionConfig();
    cachedDataSource = await new DataSource(config).initialize();
    return cachedDataSource;
  }

  getConnectionConfig = (): any => {
    const databaseURI = `postgres://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;

    // Enable SSL for non-local environments (AWS RDS requires SSL)
    const isLocal =
      process.env.DB_HOST === "localhost" ||
      process.env.DB_HOST === "127.0.0.1" ||
      process.env.DB_HOST === "host.docker.internal" ||
      process.env.DB_HOST === "postgres";

    return {
      type: "postgres",
      url: databaseURI,
      entities: entities,
      migrations: migrations,
      namingStrategy: new SnakeNamingStrategy(),
      logging: true,
      synchronize: false,
      ssl: !isLocal
        ? {
            rejectUnauthorized: false,
          }
        : false,
    };
  };
}
