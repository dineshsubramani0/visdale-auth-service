import {
  Repository,
  DeepPartial,
  FindOptionsSelect,
  FindOptionsWhere,
} from 'typeorm';
import { CustomLogger } from 'src/logger/logger.service';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

export abstract class BaseService<TEntity> {
  private readonly logger = new CustomLogger();

  constructor(protected readonly repository: Repository<TEntity>) {}

  private handleDatabaseError(error: unknown, functionName: string): never {
    if (error instanceof Error) {
      this.logger.error(
        {
          message: error.message,
          filepath: __filename,
          functionname: functionName,
        },
        error.stack ?? '',
        BaseService.name,
      );
    }
    throw error;
  }

  async create(entity: DeepPartial<TEntity>): Promise<TEntity> {
    try {
      const createdEntity = this.repository.create(entity);
      return await this.repository.save(createdEntity);
    } catch (error: unknown) {
      return this.handleDatabaseError(error, this.create.name);
    }
  }

  async findOneById(
    id: string | number,
    select?: FindOptionsSelect<TEntity>,
  ): Promise<TEntity | null> {
    try {
      return await this.repository.findOne({
        where: { id } as unknown as FindOptionsWhere<TEntity>,
        select,
      });
    } catch (error: unknown) {
      return this.handleDatabaseError(error, this.findOneById.name);
    }
  }

  async findOneByFilter(
    where: FindOptionsWhere<TEntity>,
    select?: FindOptionsSelect<TEntity>,
  ): Promise<TEntity | null> {
    try {
      return (await this.repository.findOne({ where, select })) || null;
    } catch (error: unknown) {
      return this.handleDatabaseError(error, this.findOneByFilter.name);
    }
  }

  async findMany(
    where?: FindOptionsWhere<TEntity>,
    select?: FindOptionsSelect<TEntity>,
  ): Promise<TEntity[]> {
    try {
      return await this.repository.find({ where, select });
    } catch (error: unknown) {
      return this.handleDatabaseError(error, this.findMany.name);
    }
  }

  async update(
    id: string | number,
    updateData: QueryDeepPartialEntity<TEntity>,
  ): Promise<TEntity | null> {
    try {
      await this.repository.update(id, updateData);
      return this.findOneById(id);
    } catch (error: unknown) {
      return this.handleDatabaseError(error, this.update.name);
    }
  }

  async delete(id: string | number): Promise<boolean> {
    try {
      const result = await this.repository.delete(id);
      return result.affected ? result.affected > 0 : false;
    } catch (error: unknown) {
      return this.handleDatabaseError(error, this.delete.name);
    }
  }

  async query<T = any>(sql: string, parameters?: any[]): Promise<T[]> {
    try {
      return await this.repository.query(sql, parameters);
    } catch (error: unknown) {
      return this.handleDatabaseError(error, 'query');
    }
  }
}
