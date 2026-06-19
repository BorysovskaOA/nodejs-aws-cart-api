import { MigrationInterface, QueryRunner } from "typeorm";

export class AddedFullProduct1781887622168 implements MigrationInterface {
    name = 'AddedFullProduct1781887622168'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "cart_items" ADD "product" json NOT NULL DEFAULT '{}'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "cart_items" DROP COLUMN "product"`);
    }

}
