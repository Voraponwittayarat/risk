import { Prisma } from '@prisma/client';

describe('Prisma database table mappings', () => {
  it('maps the NRLS model to the lowercase legacy table on Linux', () => {
    const model = Prisma.dmmf.datamodel.models.find(
      (candidate) => candidate.name === 'NRLS_riskstore',
    );

    expect(model).toBeDefined();
    expect(model?.dbName).toBe('nrls_riskstore');
  });
});
