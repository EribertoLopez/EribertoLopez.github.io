export enum Sections {
    Home = 'Latest',
    Projects = 'Projects',
    // Blog = 'Blog',
    Posts = 'Posts',
    Contact = 'Contact',
    // Resume = 'Resume',
    // About = 'About',
    // Another = 'Another',
    // Again = 'Again'

  }
  
export const themes: {[key in Sections]: string }= {
[Sections.Home]: '/assets/images/me_infront_of_HPC_20180129_163043.jpg',
[Sections.Posts]: '/assets/images/20170108_123337.jpg',
[Sections.Projects]: '/assets/images/20170108_123337.jpg',
[Sections.Contact]: '/assets/images/20170108_123337.jpg',
// [Sections.Resume]: '/assets/images/20170108_123337.jpg',
// [Sections.About]: '/assets/images/20170108_123337.jpg',
// [Sections.Another]: '/assets/images/20170108_123337.jpg',
// [Sections.Again]: '/assets/images/20170108_123337.jpg',
// [Sections.Projects]: 'url(src/images/projects_background.jpg)',
// [Sections.Blog]: 'url(src/images/blog_background.jpg)',
}