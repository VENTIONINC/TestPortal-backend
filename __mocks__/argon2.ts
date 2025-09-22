export default {
  hash: jest.fn(async (password: string) => {
    return `$argon2id$v=19$m=4096,t=3,p=1$mockSalt$mockHash_${password}`;
  }),
  verify: jest.fn(async (hash: string, password: string) => {
    return hash.includes(`mockHash_${password}`);
  }),
};