import { Handler } from 'aws-lambda';
import { createDatabase } from 'typeorm-extension';
import AppDataSource from '../typeorm.config';

export const migrationHandler: Handler = async () => {
  try {
    await createDatabase({
      options: AppDataSource.options,
      ifNotExist: true,
    });

    await AppDataSource.initialize();
    console.log('Database connected. Executing pending migrations...');

    const executed = await AppDataSource.runMigrations();
    console.log(`Successfully applied ${executed.length} migrations.`);

    return { status: 'SUCCESS', applied: executed.length };
  } catch (error) {
    console.error('Migration runner crashed:', error);
    throw error;
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
};
