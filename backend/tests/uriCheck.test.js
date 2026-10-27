import { describe, it, expect } from 'vitest';
import { describeMongoUri } from '../src/config/uriCheck.js';

const GOOD = 'mongodb+srv://imovies_app:Ab12Cd34@imovies.ab1cd.mongodb.net/imovies?retryWrites=true&w=majority';

describe('describeMongoUri', () => {
  it('accepts a well-formed Atlas string and never returns the password', () => {
    const info = describeMongoUri(GOOD);
    expect(info).toMatchObject({ valid: true, user: 'imovies_app', host: 'imovies.ab1cd.mongodb.net', database: 'imovies', passwordLength: 8 });
    expect(JSON.stringify(info)).not.toContain('Ab12Cd34');
  });

  it.each([
    [`  ${GOOD}\n`, /spaces/],
    [`"${GOOD}"`, /quotes/],
    [GOOD.replace('Ab12Cd34', '<db_password>'), /brackets/],
    [GOOD.replace('Ab12Cd34', 'pa@ss'), /%40/],
    [GOOD.replace('Ab12Cd34', 'pa ss'), /space/],
    [GOOD.replace('/imovies?', '/?'), /database name/],
    ['http://example.com', /does not look like/],
  ])('flags common mistakes %#', (uri, problem) => {
    const info = describeMongoUri(uri);
    expect(info.valid).toBe(false);
    expect(info.problems.join(' | ')).toMatch(problem);
  });
});
