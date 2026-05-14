/* ============================================================
 *  SERVICES — public entry point
 *  ----------------------------------------------------------------
 *  Re-exports every service so pages can write a single import:
 *
 *      import { auth, projects, applications, contact } from '../services';
 *
 *  Source files:
 *    - http.js          configured axios instance
 *    - auth.js          login / register / OTP / forgot password
 *    - projects.js      CRUD on projects + file uploads
 *    - applications.js  applications on projects
 *    - contact.js       landing-page contact form
 * ============================================================ */

export { auth } from './auth';
export { projects } from './projects';
export { applications } from './applications';
export { contact } from './contact';
export { default as http } from './http';
