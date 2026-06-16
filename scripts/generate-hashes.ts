import bcrypt from "bcrypt";

type UserSeed = {
  label: string;
  password: string;
};

const users: UserSeed[] = [
  { label: "admin@example.com", password: "password123" },

  { label: "Alice", password: "Alice@2026!" },
  { label: "John", password: "John@2026!" },
  { label: "Sarah", password: "Sarah@2026!" },
  { label: "Michael", password: "Michael@2026!" },
  { label: "David", password: "David@2026!" },
  { label: "Emma", password: "Emma@2026!" },
  { label: "Daniel", password: "Daniel@2026!" },
  { label: "Olivia", password: "Olivia@2026!" },
  { label: "James", password: "James@2026!" },
  { label: "Sophia", password: "Sophia@2026!" },
];

async function run() {
  const saltRounds = 10;

  console.log("\n=== GENERATED BCRYPT HASHES ===\n");

  for (const user of users) {
    const hash = await bcrypt.hash(user.password, saltRounds);

    console.log({
      label: user.label,
      password: user.password,
      hash,
    });
  }

  console.log("\n=== DONE ===\n");
}

run();