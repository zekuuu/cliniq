# Tech Stack Summary

CLINIQ is designed as three connected parts: a browser-based screen for users, a server that applies the clinic's rules and protects access, and a database that stores records. The system is meant to run on the school's local network, so its core work does not depend on the public internet.

## What users see

The user-facing part uses React and TypeScript to build the screens, with Tailwind CSS to keep their appearance consistent. Vite is the tool that prepares those screens for delivery; it turns the app into files that the school server can provide to browsers.

React Router gives each screen a clear web address, such as a student or visit page, instead of relying on temporary screen switches. One central route list controls which role can open each screen, and screens load when needed rather than all at once.

For information on a screen, the app uses the existing useAsyncData helper and feature-level API files. In plain terms, this gives every screen the same way to wait for information, show a problem, retry, and later switch from sample data to the real clinic service without adding a larger data-management tool before it is needed.

## Where records and rules live

Laravel, a PHP web framework, provides the server side: it receives requests, applies clinic rules, and connects to MySQL, the database that keeps student, visit, incident, and inventory records. Laravel Sanctum handles sign-in for the browser app so access can be limited by role.

XAMPP is the shared local setup for the school and development computers. During preparation, Vite can pass requests to Laravel; when deployed, Laravel and Apache serve the finished browser files and the clinic service from the same local address.

## Supporting tools

Dashboard charts use Chart.js through react-chartjs-2 because it is lighter on the school's 4 GB workstation than the alternative considered. Automated checks use Pest for the server side and Vitest with React Testing Library for the user-facing screens.

The same arrangement can later move from the local network to a remote host because the browser app already talks to the server through a defined service boundary. That move would change where the system is hosted, not require rebuilding its overall structure.
