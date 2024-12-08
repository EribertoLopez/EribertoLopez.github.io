import Avatar from './avatar'
import DateFormatter from './date-formatter'
import CoverImage from './cover-image'
import PostTitle from './post-title'
import type Author from '../interfaces/author'
import { Sections } from '../lib/ConfigUtils'
import { Github, Linkedin, Globe } from 'lucide-react';

type Props = {
  title: string
  coverImage: string
  date: string
  author: Author
  currentTheme: Sections
}

type Skill = {
  category: string;
  items: string[];
};

type Education = {
  degree: string;
  school: string;
  location: string;
  period: string;
  details?: string[];
  advisor?: string;
  dissertation?: string;
};

type ResumeProps = {
  name: string;
  title: string;
  location: string;
  summary: string;
  profileImage: string;
  skills: Skill[];
  socialLinks: {
    github?: string;
    linkedin?: string;
    website?: string;
  };
  education: Education[];
};

const Resume = ({
  name,
  title,
  location,
  summary,
  profileImage,
  skills,
  socialLinks,
  education
}: ResumeProps) => {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex">
      {/* Sidebar */}
      <div className="w-72 bg-slate-900 p-8 flex flex-col">
        {/* Profile Section */}
        <div className="text-center mb-8">
          <div className="w-32 h-32 mx-auto mb-4 overflow-hidden rounded-full">
            <img 
              src={profileImage} 
              alt={name}
              className="w-full h-full object-cover"
            />
          </div>
          <h1 className="text-2xl font-bold mb-1">{name}</h1>
          <p className="text-sm text-gray-400 mb-4">{title}</p>
          <p className="text-sm text-gray-400">{location}</p>
          
          {/* Social Links */}
          <div className="flex justify-center space-x-4 mt-4">
            {socialLinks.github && (
              <a href={socialLinks.github} className="text-gray-400 hover:text-white">
                <Github size={20} />
              </a>
            )}
            {socialLinks.linkedin && (
              <a href={socialLinks.linkedin} className="text-gray-400 hover:text-white">
                <Linkedin size={20} />
              </a>
            )}
            {socialLinks.website && (
              <a href={socialLinks.website} className="text-gray-400 hover:text-white">
                <Globe size={20} />
              </a>
            )}
          </div>
        </div>

        {/* Skills Section */}
        {skills.map((skillGroup) => (
          <div key={skillGroup.category} className="mb-6">
            <h2 className="text-lg font-semibold mb-3">{skillGroup.category}</h2>
            <div className="flex flex-wrap gap-2">
              {skillGroup.items.map((item) => (
                <span
                  key={item}
                  className="text-sm bg-slate-800 px-2 py-1 rounded"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8">
        {/* Summary */}
        <div className="mb-12 bg-blue-900/50 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Summary</h2>
          <p className="text-gray-200 leading-relaxed">
            {summary}
          </p>
        </div>

        {/* Education */}
        <div className="mb-12">
          <h2 className="text-xl font-semibold mb-6">Education</h2>
          {education.map((edu, index) => (
            <div key={index} className="mb-8">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="text-lg font-medium">{edu.degree}</h3>
                  <p className="text-gray-400">{edu.school}</p>
                </div>
                <div className="text-right">
                  <p className="text-gray-400">{edu.period}</p>
                  <p className="text-gray-400">{edu.location}</p>
                </div>
              </div>
              {edu.advisor && (
                <p className="text-gray-300 mt-2">
                  Advisor: {edu.advisor}
                </p>
              )}
              {edu.dissertation && (
                <p className="text-gray-300 mt-2">
                  Dissertation: {edu.dissertation}
                </p>
              )}
              {edu.details && (
                <ul className="list-disc list-inside mt-2 text-gray-300">
                  {edu.details.map((detail, idx) => (
                    <li key={idx}>{detail}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};


const MyResume = () => {
  const resumeData = {
    name: "Eriberto Lopez",
    title: "Full-Stack Developer",
    location: "Your Location",
    profileImage: "/path/to/your/image.jpg",
    summary: "Full-stack developer passionate about creating beautiful and functional web experiences...",
    socialLinks: {
      github: "https://github.com/yourusername",
      linkedin: "https://linkedin.com/in/yourusername",
      website: "https://yourwebsite.com"
    },
    skills: [
      {
        category: "Languages",
        items: ["JavaScript", "TypeScript", "Python", "SQL"]
      },
      {
        category: "Web Technologies",
        items: ["React", "Next.js", "Node.js", "Express"]
      },
      {
        category: "Infrastructure",
        items: ["AWS", "Docker", "Kubernetes"]
      }
    ],
    education: [
      {
        degree: "Your Degree",
        school: "Your University",
        location: "Location",
        period: "2019-2023",
        advisor: "Dr. Someone",
        dissertation: "Your dissertation topic",
        details: ["Achievement 1", "Achievement 2"]
      }
    ]
  };

  return <Resume {...resumeData} />;
};

const PostHeader = ({ title, coverImage, date, author, currentTheme }: Props) => {

      return (
        <>
          <PostTitle>{title}</PostTitle>
          <div className="hidden md:block md:mb-12">
            <Avatar name={author.name} picture={author.picture} />
          </div>
          {/* <div className="mb-8 md:mb-16 sm:mx-0"> */}
          {/* <div className="mb-8 md:mb-16 sm:mx-0">
            <CoverImage title={title} src={coverImage} isHero={false} currentTheme={currentTheme}/>
          </div> */}
          <div className="max-w-2xl mx-auto">
            <div className="block md:hidden mb-6">
              <Avatar name={author.name} picture={author.picture} />
            </div>
            <div className="mb-6 text-lg">
              <DateFormatter dateString={date} />
            </div>
          </div>
        </>
      )

}

export default PostHeader
