# Code Generation

[Back to root](../README.md)

This directory contains OpenAPI specification and custom Mustache templates for generating TypeScript code.

## Overview

The code generation pipeline uses [OpenAPI Generator](https://openapi-generator.tech/) with custom templates to produce:

- **Models** - TypeScript interfaces from OpenAPI schemas
- **Services** - Service interfaces and base implementations for API operations
- **Entities** - TypeORM entity classes from schemas marked with `x-entity: true`

## Directory Structure

```
codegen/
├── config.yaml              # OpenAPI Generator configuration
├── openapi.yaml             # API specification with x-* extensions
├── Dockerfile               # Container for running the generator
└── templates/
    └── typescript/
        ├── service.mustache          # Service interface template
        ├── serviceImpl.mustache      # Base service implementation template
        ├── service.index.mustache    # Services barrel file
        ├── entity.mustache           # TypeORM entity template
        └── entity.index.mustache     # Entities barrel file
```

## Running Code Generation

**Recommended**: Run from the project root to regenerate all code:

```bash
npm run codegen
```

This generates TypeScript code for both frontend and backend from the OpenAPI spec.

### Individual Generation

```bash
# From project root
npm run codegen:backend    # Backend only
npm run codegen:frontend   # Frontend only

# Or using scripts directly
./scripts/codegen-backend.sh
./scripts/codegen-frontend.sh
```

### Output Locations

| Target | Output Directory |
|--------|-----------------|
| Backend | `backend/src/generated/` |
| Frontend | `frontend/generated/` |

## Vendor Extensions (x-* Properties)

Custom `x-*` extensions in `openapi.yaml` control code generation behavior. The template auto-detects many things (like enums and types), so only a minimal set of extensions is required.

### Schema-Level Extensions

| Extension | Required | Type | Description | Example |
|-----------|----------|------|-------------|---------|
| `x-entity` | **Yes** | `boolean` | Mark schema for TypeORM entity generation | `x-entity: true` |
| `x-table-name` | No | `string` | Custom database table name (defaults to schema key, e.g., `Transaction`) | `x-table-name: transactions` |

### Property-Level Extensions

| Extension | Required | Type | Description | Example |
|-----------|----------|------|-------------|---------|
| `x-primary-key` | **Yes*** | `boolean` | Mark property as primary key | `x-primary-key: true` |
| `x-generated` | No | `string` | Auto-generation strategy: `uuid` or `increment` | `x-generated: uuid` |
| `x-column-type` | No | `string` | Override auto-detected TypeORM column type | `x-column-type: text` |
| `x-column-length` | No | `number` | Varchar column length (default: 255) | `x-column-length: 500` |
| `x-default` | No | `any` | SQL default value | `x-default: false` |
| `x-default-code` | No | `string` | JavaScript code for constructor default | `x-default-code: "new Date()"` |

\* Required on exactly one property per entity

## Auto-Detection

The template automatically detects the following without needing x-* extensions:

| OpenAPI Feature | Auto-Detected As |
|-----------------|------------------|
| `type: string` | `varchar(255)` column |
| `type: integer` | `integer` column |
| `type: number` / `format: float` | `decimal` column |
| `type: boolean` | `boolean` column |
| `format: date-time` | `timestamp` column |
| `$ref` to enum schema | `enum` column with correct enum type |
| Property in `required` array | `nullable: false` |
| Property not in `required` | `nullable: true` |

## Example Schema

```yaml
components:
  schemas:
    TransactionStatus:
      type: string
      enum:                    # Auto-detected as enum
        - success
        - failure
        - pending

    Transaction:
      type: object
      x-entity: true           # Required: marks this for entity generation
      # Table name defaults to "Transaction" (schema key)
      required:
        - id
        - status
        - createdAt
      properties:
        id:
          type: string
          format: uuid
          x-primary-key: true  # Required: marks primary key
          x-generated: uuid    # Optional: auto-generate UUID

        status:
          $ref: "#/components/schemas/TransactionStatus"
          # Auto-detected as enum column

        amount:
          type: number
          format: float
          # Auto-detected as decimal column

        notes:
          type: string
          x-column-type: text  # Override: use text instead of varchar

        email:
          type: string
          x-column-length: 320 # Override: custom varchar length

        isActive:
          type: boolean
          x-default: true      # SQL default value

        createdAt:
          type: string
          format: date-time
          x-default-code: "new Date()"  # JS constructor default

        updatedAt:
          type: string
          format: date-time
          nullable: true
```

## Generated Output

The above schema generates:

```typescript
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { Transaction } from "../models/Transaction";
import { TransactionStatus } from "../models/TransactionStatus";

@Entity("Transaction")
export class TransactionEntity implements Transaction {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({
    type: "enum",
    enum: TransactionStatus,
    nullable: false,
  })
  status: TransactionStatus;

  @Column({
    type: "decimal",
    nullable: true,
  })
  amount?: number;

  @Column({
    type: "text",
    nullable: true,
  })
  notes?: string;

  @Column({
    type: "varchar",
    length: 320,
    nullable: true,
  })
  email?: string;

  @Column({
    type: "boolean",
    nullable: true,
    default: true,
  })
  isActive?: boolean;

  @Column({
    type: "timestamp",
    nullable: false,
  })
  createdAt: Date;

  @Column({
    type: "timestamp",
    nullable: true,
  })
  updatedAt?: Date;

  constructor(data?: Partial<Transaction>) {
    if (data) {
      Object.assign(this, data);
      if (this.createdAt === undefined) {
        this.createdAt = new Date();
      }
    }
  }
}
```

## Column Type Reference

Use `x-column-type` to override auto-detected types:

| Value | Use Case |
|-------|----------|
| `varchar` | Short strings (auto-detected for `type: string`) |
| `text` | Long text content |
| `integer` | Whole numbers (auto-detected for `type: integer`) |
| `decimal` | Floating point (auto-detected for `type: number`) |
| `boolean` | True/false (auto-detected for `type: boolean`) |
| `timestamp` | Date and time (auto-detected for `format: date-time`) |
| `date` | Date only |
| `jsonb` | JSON data (PostgreSQL) |
| `uuid` | UUID values |

## Template Development Notes

When writing custom Model templates for OpenAPI Generator:

1. **Model context**: Data is nested inside `{{#models}}{{#model}}...{{/model}}{{/models}}`
2. **Vendor extensions**: Access via `{{#vendorExtensions.x-entity}}` (hyphens work inside model block)
3. **Type detection variables**:
   - `isEnumRef` - true for `$ref` to enum schemas
   - `isNumeric` / `isFloat` - true for number types
   - `isInteger` - true for integer types
   - `isBoolean` - true for boolean types
   - `isDateTime` - true for date-time format
   - `isString` - true for string types
4. **Enum type name**: Use `{{datatypeWithEnum}}` to get the enum type name

## Notes

- Schemas without `x-entity: true` are skipped during entity generation
- The `required` array in OpenAPI determines `nullable` in TypeORM columns
- Enums are auto-detected when using `$ref` to a schema with `enum` keyword
- Table name defaults to the schema key (e.g., `Transaction`) unless `x-table-name` is specified
- Generated files are placed in `backend/src/generated/` and `frontend/generated/`
