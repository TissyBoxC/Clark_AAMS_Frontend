const AUTH_BACKGROUND_MODULES = import.meta.glob('../assets/auth-backgrounds/*.{png,jpg,jpeg,webp,avif,gif}', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

export const AUTH_BACKGROUND_IMAGES = Object.values(AUTH_BACKGROUND_MODULES).sort((left, right) => {
  return left.localeCompare(right);
});

export const AUTH_BACKGROUND_FOLDER_PATH = 'src/assets/auth-backgrounds';
