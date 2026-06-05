// Allow TypeScript to accept CSS side-effect imports (e.g. mapbox-gl/dist/mapbox-gl.css)
declare module "*.css" {
  const content: Record<string, string>;
  export default content;
}
