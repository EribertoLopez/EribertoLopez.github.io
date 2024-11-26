export enum Sections {
    Home = 'Home',
    Projects = 'Projects',
    // Blog = 'Blog',
    Posts = 'Posts'
  }
  
export const themes: {[key in Sections]: string }= {
[Sections.Home]: '/assets/images/me_infront_of_HPC_20180129_163043.jpg',
[Sections.Posts]: '/assets/images/20170108_123337.jpg',
[Sections.Projects]: '/assets/images/20170108_123337.jpg',
// [Sections.Projects]: 'url(src/images/projects_background.jpg)',
// [Sections.Blog]: 'url(src/images/blog_background.jpg)',
}