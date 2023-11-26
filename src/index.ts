import "whatwg-fetch";

interface TursoConfig {
  token: string;
  org?: string;
  baseUrl?: string;
}

interface ApiToken {
  id: string;
  name: string;
}

class ApiTokenClient {
  constructor(private config: TursoConfig) {}

  async list(): Promise<ApiToken[]> {
    const response = await TursoClient.request<{ tokens: ApiToken[] }>(
      "auth/api-tokens",
      this.config
    );

    return response.tokens ?? [];
  }

  async create(name: string) {
    const response = await TursoClient.request<ApiToken & { token: string }>(
      `auth/api-tokens/${name}`,
      this.config,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
      }
    );

    return response;
  }

  async revoke(name: string) {
    const response = await TursoClient.request<{ token: string }>(
      `auth/api-tokens/${name}`,
      this.config,
      {
        method: "DELETE",
      }
    );

    return response;
  }

  async validate(token: string): Promise<{ valid: boolean; expiry: number }> {
    const response = await TursoClient.request<{ exp: number }>(
      "auth/api-tokens/validate",
      this.config,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const currentTime = Math.floor(Date.now() / 1000);

    return {
      valid: response.exp !== -1 && response.exp > currentTime,
      expiry: response.exp,
    };
  }
}

interface Organization {
  name: string;
  slug: string;
  type: "personal" | "team";
  overages: boolean;
  blocked_reads: boolean;
  blocked_writes: boolean;
}

interface OrganizationMember {
  role: "owner" | "member";
  username: string;
  email: string;
}

class OrganizationClient {
  constructor(private config: TursoConfig) {}

  async list(): Promise<Organization[]> {
    const response = await TursoClient.request<{
      organizations: Organization[];
    }>("organizations", this.config);

    return response.organizations ?? [];
  }

  async members(): Promise<OrganizationMember[]> {
    const response = await TursoClient.request<{
      members: OrganizationMember[];
    }>(`organisations/${this.config.org}/members`, this.config);

    return response.members ?? [];
  }
}

type LocationKeys = {
  ams: string;
  arn: string;
  bog: string;
  bos: string;
  cdg: string;
  den: string;
  dfw: string;
  ewr: string;
  fra: string;
  gdl: string;
  gig: string;
  gru: string;
  hkg: string;
  iad: string;
  jnb: string;
  lax: string;
  lhr: string;
  mad: string;
  mia: string;
  nrt: string;
  ord: string;
  otp: string;
  qro: string;
  scl: string;
  sea: string;
  sin: string;
  sjc: string;
  syd: string;
  waw: string;
  yul: string;
  yyz: string;
  [key: string]: string;
};

type Location = {
  [K in keyof LocationKeys]: { code: K; description: LocationKeys[K] };
}[keyof LocationKeys];

class LocationClient {
  constructor(private config: TursoConfig) {}

  async list(): Promise<Location[]> {
    const response = await TursoClient.request<{
      locations: LocationKeys;
    }>("locations", this.config);

    if (!response.locations) {
      return [];
    }

    return Object.entries(response.locations).map(([code, description]) => ({
      code,
      description,
    }));
  }
}

interface Group {
  locations: Array<keyof LocationKeys>;
  name: string;
  primary: keyof LocationKeys;
}

class GroupClient {
  constructor(private config: TursoConfig) {}

  async list(): Promise<Group[]> {
    const response = await TursoClient.request<{ groups: Group[] }>(
      this.config.org ? `organizations/${this.config.org}/groups` : "groups",
      this.config
    );

    return response.groups ?? [];
  }

  async get(name: string): Promise<Group> {
    const response = await TursoClient.request<{ group: Group }>(
      this.config.org
        ? `organizations/${this.config.org}/groups/${name}`
        : `groups/${name}`,
      this.config
    );

    return response.group;
  }

  async create(data: {
    name: string;
    location: Array<keyof LocationKeys>;
  }): Promise<Group> {
    const response = await TursoClient.request<{ group: Group }>(
      this.config.org ? `organizations/${this.config.org}/groups` : "groups",
      this.config,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(data),
      }
    );

    return response.group;
  }

  async delete(name: string): Promise<Group> {
    const response = await TursoClient.request<{ group: Group }>(
      this.config.org
        ? `organizations/${this.config.org}/groups/${name}`
        : `groups/${name}`,
      this.config,
      {
        method: "DELETE",
      }
    );

    return response.group;
  }

  async addLocation(
    groupName: string,
    location: keyof LocationKeys
  ): Promise<Group> {
    const endpoint = this.config.org
      ? `organizations/${this.config.org}/groups/${groupName}/locations/${location}`
      : `groups/${groupName}/locations/${location}`;

    const response = await TursoClient.request<{ group: Group }>(
      endpoint,
      this.config,
      {
        method: "POST",
      }
    );

    return response.group;
  }

  async removeLocation(
    groupName: string,
    location: keyof LocationKeys
  ): Promise<Group> {
    const endpoint = this.config.org
      ? `organizations/${this.config.org}/groups/${groupName}/locations/${location}`
      : `groups/${groupName}/locations/${location}`;

    const response = await TursoClient.request<{ group: Group }>(
      endpoint,
      this.config,
      {
        method: "DELETE",
      }
    );

    return response.group;
  }
}

interface ApiDatabaseResponse extends Database {
  Name: string;
  DbId: string;
  Hostname: string;
}

interface Database {
  name: string;
  id: string;
  hostname: string;
  regions?: Array<keyof LocationKeys>;
  primaryRegion?: keyof LocationKeys;
  type: string;
  version: string;
  group?: string;
}

interface DatabaseInstanceUsageDetail {
  rows_read: number;
  rows_written: number;
  storage_bytes: number;
}

interface DatabaseInstanceUsage {
  uuid: string;
  usage: DatabaseInstanceUsageDetail;
}

interface DatabaseUsage {
  uuid: string;
  instances: DatabaseInstanceUsage[];
  usage: DatabaseInstanceUsageDetail;
}

interface InstanceUsages {
  [instanceUuid: string]: DatabaseInstanceUsageDetail;
}

interface TotalUsage {
  rows_read: number;
  rows_written: number;
  storage_bytes: number;
}

class DatabaseClient {
  constructor(private config: TursoConfig) {}

  async list(): Promise<Database[]> {
    const response = await TursoClient.request<{
      databases: ApiDatabaseResponse[];
    }>(
      this.config.org
        ? `organizations/${this.config.org}/databases`
        : "databases",
      this.config
    );

    return (response.databases ?? []).map((db) => this.formatResponse(db));
  }

  async get(name: string): Promise<Database> {
    const response = await TursoClient.request<{
      database: ApiDatabaseResponse;
    }>(
      this.config.org
        ? `organizations/${this.config.org}/databases/${name}`
        : `databases/${name}`,
      this.config
    );

    return this.formatResponse(response.database);
  }

  async create(
    name: string,
    options?: { image: "latest" | "canary"; group?: string }
  ): Promise<Database> {
    const response = await TursoClient.request<{ database: Database }>(
      this.config.org
        ? `organizations/${this.config.org}/databases/${name}`
        : `databases/${name}`,
      this.config,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          name,
          ...options,
        }),
      }
    );

    return response.database;
  }

  async update(name: string): Promise<void> {
    return await TursoClient.request(
      this.config.org
        ? `organizations/${this.config.org}/databases/${name}/update`
        : `databases/${name}`,
      this.config,
      {
        method: "POST",
      }
    );
  }

  async delete(name: string) {
    const response = await TursoClient.request<{ database: string }>(
      this.config.org
        ? `organizations/${this.config.org}/databases/${name}`
        : `databases/${name}`,
      this.config,
      {
        method: "DELETE",
      }
    );

    return response;
  }

  async createToken(
    dbName: string,
    options?: {
      expiration: string;
      authorization: "read-only" | "full-access";
    }
  ) {
    const url = this.config.org
      ? `organizations/${this.config.org}/databases/${dbName}/auth/tokens`
      : `databases/${dbName}/auth/tokens`;

    const queryParams = new URLSearchParams();

    if (options?.expiration) {
      queryParams.set("expiration", options.expiration);
    }

    if (options?.authorization) {
      queryParams.set("authorization", options.authorization);
    }

    const response = await TursoClient.request<{ jwt: string }>(
      `${url}?${queryParams}`,
      this.config,
      {
        method: "POST",
      }
    );

    return response;
  }

  async rotateTokens(dbName: string): Promise<void> {
    return await TursoClient.request<void>(
      this.config.org
        ? `organizations/${this.config.org}/databases/${dbName}/auth/rotate`
        : `databases/${dbName}/auth/rotate`,
      this.config,
      {
        method: "POST",
      }
    );
  }

  async usage(
    dbName: string,
    options?: { from?: Date | string; to?: Date | string }
  ): Promise<DatabaseUsage> {
    const url = this.config.org
      ? `organizations/${this.config.org}/databases/${dbName}/usage`
      : `databases/${dbName}/usage`;

    const queryParams = new URLSearchParams();

    if (options?.from) {
      queryParams.set("from", this.formatDateParameter(options.from));
    }

    if (options?.to) {
      queryParams.set("to", this.formatDateParameter(options.to));
    }

    const response = await TursoClient.request<{
      database: DatabaseUsage;
      instances: InstanceUsages;
      total: TotalUsage;
    }>(`${url}?${queryParams}`, this.config);

    return response.database;
  }

  private formatDateParameter(date: Date | string): string {
    return date instanceof Date ? date.toISOString() : date;
  }

  private formatResponse(db: ApiDatabaseResponse): Database {
    return {
      name: db.Name,
      id: db.DbId,
      hostname: db.Hostname,
      regions: db.regions,
      primaryRegion: db.primaryRegion,
      type: db.type,
      version: db.version,
      group: db.group,
    };
  }
}

class TursoClient {
  private config: TursoConfig;
  public apiTokens: ApiTokenClient;
  public organizations: OrganizationClient;
  public locations: LocationClient;
  public groups: GroupClient;
  public databases: DatabaseClient;

  constructor(config: TursoConfig) {
    this.config = {
      baseUrl: "https://api.turso.tech/v1",
      ...config,
    };

    this.apiTokens = new ApiTokenClient(this.config);
    this.organizations = new OrganizationClient(this.config);
    this.locations = new LocationClient(this.config);
    this.groups = new GroupClient(this.config);
    this.databases = new DatabaseClient(this.config);
  }

  static async request<T>(
    url: string,
    config: TursoConfig,
    options: RequestInit = {}
  ) {
    const response = await fetch(new URL(url, config.baseUrl), {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${config.token}`,
        "User-Agent": "JS SDK",
      },
    });

    if (!response.ok) {
      throw new Error(`Something went wrong! Status ${response.status}`);
    }

    return response.json() as T;
  }
}

export function createClient(config: TursoConfig): TursoClient {
  return new TursoClient(config);
}
