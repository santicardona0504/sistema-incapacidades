import bcrypt from 'bcryptjs';

const RONDAS = 12;

export function hashPassword(password) {
  return bcrypt.hash(password, RONDAS);
}

export function comparePassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash);
}
