/**
 * Explains a MongoDB connection string WITHOUT revealing the password.
 * Used to diagnose "bad auth" / connection errors in hosting logs.
 */
export function describeMongoUri(raw) {
  const problems = [];
  const value = String(raw ?? '');

  if (value !== value.trim()) problems.push('value starts or ends with spaces / new lines');
  const trimmed = value.trim();
  if (/^["'].*["']$/.test(trimmed)) problems.push('value is wrapped in quotes - remove the quotes');
  const uri = trimmed.replace(/^["']|["']$/g, '');

  const match = uri.match(/^(mongodb(?:\+srv)?):\/\/(?:([^:@/]*)(?::(.*))?@)?([^/?]+)(?:\/([^?]*))?(?:\?(.*))?$/);
  if (!match) {
    return { valid: false, problems: [...problems, 'does not look like mongodb:// or mongodb+srv:// connection string'] };
  }

  const [, scheme, user = '', password = '', host, database = '', query = ''] = match;
  if (password.includes('@')) problems.push('password contains "@" - it must be written as %40 (or generate a letters-and-digits password)');
  if (!user) problems.push('no username before the ":"');
  if (!password) problems.push('no password between ":" and "@"');
  if (/[<>]/.test(password) || /[<>]/.test(user)) problems.push('contains "<" or ">" - replace <db_password> completely, including the brackets');
  if (/db_password/i.test(password)) problems.push('still contains the placeholder text db_password');
  if (/\s/.test(password)) problems.push('password contains a space');
  if (/[:/?#[\]]/.test(password)) problems.push('password contains : / ? # [ or ] which must be URL-encoded');
  if (/%(?![0-9A-Fa-f]{2})/.test(password)) problems.push('password contains a "%" that is not valid URL-encoding');
  if (!database) problems.push('no database name after ".mongodb.net/" (add imovies)');
  if (scheme === 'mongodb+srv' && !/\.mongodb\.net$/i.test(host)) {
    problems.push('host does not end with .mongodb.net');
  }

  return {
    valid: problems.length === 0,
    scheme,
    user,
    passwordLength: password.length,
    host,
    database,
    options: query,
    problems,
  };
}
