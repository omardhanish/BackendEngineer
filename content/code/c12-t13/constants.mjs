export const UserRolesEnum = Object.freeze({ ADMIN: 'admin', USER: 'user' });
export const AvailableUserRoles = Object.values(UserRolesEnum);
export const DB_NAME = 'auth-backend';

const isRole = (value) => AvailableUserRoles.includes(value);
console.log(UserRolesEnum.ADMIN, isRole('admin'), isRole('Admin'));
console.log(AvailableUserRoles, DB_NAME);
try {
  UserRolesEnum.ADMIN = 'root';
} catch (error) {
  console.log(error.name);
}
console.log(UserRolesEnum.ADMN);
