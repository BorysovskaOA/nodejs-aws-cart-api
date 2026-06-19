import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialMigration1780765380214 implements MigrationInterface {
  name = 'InitialMigration1780765380214';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."carts_status_enum" AS ENUM('OPEN', 'ORDERED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "carts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "status" "public"."carts_status_enum" NOT NULL DEFAULT 'OPEN', CONSTRAINT "PK_b5f695a59f5ebb50af3c8160816" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "cart_items" ("cart_id" uuid NOT NULL, "product_id" uuid NOT NULL, "count" integer NOT NULL, CONSTRAINT "PK_dba960dbfd8636893d3c7acb18d" PRIMARY KEY ("cart_id", "product_id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "cart_items" ADD CONSTRAINT "FK_6385a745d9e12a89b859bb25623" FOREIGN KEY ("cart_id") REFERENCES "carts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "cart_items" DROP CONSTRAINT "FK_6385a745d9e12a89b859bb25623"`,
    );
    await queryRunner.query(`DROP TABLE "cart_items"`);
    await queryRunner.query(`DROP TABLE "carts"`);
    await queryRunner.query(`DROP TYPE "public"."carts_status_enum"`);
  }
}
