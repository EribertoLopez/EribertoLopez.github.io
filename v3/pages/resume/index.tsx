import Container from '../../components/container'
import Layout from '../../components/layout'

import Head from 'next/head'

import myImage from "../../public/favicon/IBelieveICanShibe_edited_50x50.png";

import styles from './resume.module.css'
import Image from "next/image";
import { getAllResumes } from '../../lib/api';
// import { Props } from 'next/script';
import { useState } from 'react';
import SidebarLayout from '../../components/SidebarLayout';
import { Sections } from '../../lib/ConfigUtils';
import Post from '../../interfaces/post'
import Intro from '../../components/intro';
import { Github, Linkedin, Globe } from 'lucide-react'

type Props = {
  allPosts: Post[]
}

// type Props = {
//   post: ProjectType
//   morePosts: ProjectType[]
//   preview?: boolean
//   currentTheme: Sections
// }

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
  experience: Experience[];
  publications: Publication[];
  contact: Contact;
};
// Types
type Experience = {
  title: string;
  company: string;
  location: string;
  period: string;
  description?: string;
  achievements: string[];
};

type Publication = {
  date: string;
  journal: string;
  title: string;
  description: string[];
};

type Contact = {
  phone: string;
  email: string;
  github: string;
};




const Resume = ({
  name,
  title,
  location,
  summary,
  profileImage,
  skills,
  socialLinks,
  education,
  experience,
  publications,
  contact
}: ResumeProps) => {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex">
      {/* Sidebar */}
      <div className="w-72 bg-slate-900 p-8 flex flex-col">
        


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

        {/* Experience Section */}
        <div className="mb-12">
          <h2 className="text-xl font-semibold mb-6">Professional Experience</h2>
          {experience.map((exp, index) => (
            <div key={index} className="mb-8">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="text-lg font-medium">{exp.title}</h3>
                  <p className="text-gray-400">{exp.company}</p>
                </div>
                <div className="text-right">
                  <p className="text-gray-400">{exp.period}</p>
                  <p className="text-gray-400">{exp.location}</p>
                </div>
              </div>
              {exp.description && (
                <p className="text-gray-300 mt-2 italic">
                  {exp.description}
                </p>
              )}
              <ul className="list-disc list-inside mt-2 text-gray-300">
                {exp.achievements.map((achievement, idx) => (
                  <li key={idx} className="ml-4">
                    {achievement}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Publications Section */}
        <div className="mb-12">
          <h2 className="text-xl font-semibold mb-6">Publications</h2>
          {publications.map((pub, index) => (
            <div key={index} className="mb-8">
              <div className="mb-2">
                <h3 className="text-lg font-medium">{pub.title}</h3>
                <p className="text-gray-400">{pub.journal} - {pub.date}</p>
              </div>
              <ul className="list-disc list-inside mt-2 text-gray-300">
                {pub.description.map((desc, idx) => (
                  <li key={idx} className="ml-4">
                    {desc}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Education Section */}
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
                    <li key={idx} className="ml-4">{detail}</li>
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
    title: "Software Engineering Manager/Lead",
    location: "Remote",
    contact: {
      phone: "949.701.8662",
      email: "elopez75@gatech.edu",
      github: "EribertoLopez"
    },
    profileImage: '/assets/blog/authors/EriLopez3.png', // You'll need to provide the actual path
    
    summary: "Software professional with experience in building and managing technical teams, mentoring agile team cultures, and developing full-stack systems. A detail-oriented researcher skilled in generating data for patent proposals, publications, and grant manuscripts. Proven track record in coordinating and designing software solutions that empower stakeholders in biotech, pharma, and Dept. of Defense to command and control devices while ensuring secure proprietary data capture. Recognized for leadership, innovative problem solving, and commitment to continuous improvement.",
    
    skills: [
      {
        category: "Languages/Frameworks",
        items: [
          "Python(Flask, FastAPI)", "JavaScript", "TypeScript(NextJS, React, ReactHooks, MobX)", 
          "Java(SpringBoot, JPA, Hibernate)"
        ]
      },
      {
        category: "Infrastructure & Tools",
        items: [
          "GraphQL", "REST", "Terraform", "OpenAPI/Swagger", "AWS(IaaC, EKS, ECS, RDS)", 
          "ArgoCD"
        ]
      },
      {
        category: "Databases",
        items: [
          "MySQL", "Postgres", "RabbitMQ"
        ]
      }
    ],
  
    experience: [
      {
        title: "Software Engineering Manager/Lead",
        company: "Strateos, Inc.",
        location: "Remote",
        period: "7/2022 – Present",
        description: "Pioneered the industry's first robotic cloud lab. Enables users to plan experiments, command-and-control robotic execution, securely capture proprietary data, and visualize real-time execution history from remote or on-site devices.",
        achievements: [
          "Lead an internal team of 7 and third-party offshore development team as the tech lead for the workflows domain. Guide feature implementation to capture scientific intent and transform to machine-readable executable code.",
          "Boosted team velocity by 38% through enhancements in average story points per developer, coupled with an 83% sprint completion rate over the last year. Use Jira & Slack APIs to automate processes and improve accountability.",
          "Streamlined incident triaging processes, by improving team accountability for respective components. Resulted in a 113% increase in engineer volunteering rates.",
          "Spearheaded and incorporated data-driven initiatives into quarterly roadmaps, significantly reducing tech debt and improving the user experience. Achieved a 53% reduction in workflow builder front-end total load time.",
          "Optimized front-end React components by migrating to a MobX bi-directional stage-management approach."
        ]
      },
      {
        title: "Senior Software Engineer",
        company: "Strateos, Inc.",
        location: "Remote",
        period: "12/2021 – 7/2022",
        description: "Scaled Strateos' legacy scientific intent execution system from lambda functions to microservice architecture.",
        achievements: [
          "Spearheaded the development of a workflow execution system, offering scientists a platform to execute complex CWL workflows on shared infrastructure while safeguarding proprietary data.",
          "Streamlined data ingestion pipelines for both web and robotic domains, reducing complexity and enhancing monitoring of raw data capture.",
          "Contributor in filed patent for 'Systems and Methods For Processing Experimental Workflow at a Remote Laboratory'"
        ]
      },
      {
        title: "Software Engineer III",
        company: "Strateos, Inc.",
        location: "Menlo Park, CA",
        period: "8/2019 – 12/2021",
        description: "Developed and maintained features and scientific intent schemas that are device agnostic and reproducibly executed.",
        achievements: [
          "Achieved 64x increase in cloud lab sample throughput by optimizing computer vision and robotic commands.",
          "Developed Python statistical software to automate cluster identification of multidimensional data, significantly reducing the hands-on quality control validation time for operational teams by 50%.",
          "Curator of open-source machine readable scientific intent schemas, autoprotocol.org & autoprotocol-py"
        ]
      },
      {
        title: "Research Engineer II",
        company: "University of Washington",
        location: "Seattle, WA",
        period: "7/2017 – 8/2019",
        description: "Klavins Lab DARPA grant used to automate remote execution of the design, build, and test cycle for genetic systems.",
        achievements: [
          "Enabled Synergistic Discovery and Design DARPA stakeholders to remotely design, build, and test genetic CRISPR systems.",
          "Developed a Python client to facilitate ETL processes, extracting and loading data from remote labs to Texas Advanced Computing Center's HPCs.",
          "Integrated Klavins Lab scientific devices with web application (Ruby on Rails, Angular) and AWS cloud resources.",
          "Co-authored algorithmic design of thousands of non-repetitive synthetic parts for genetic systems in microbes."
        ]
      }
    ],
  
    publications: [
      {
        date: "7/2020",
        journal: "Nature Biotechnology Journal",
        title: "Automated design of thousands of non-repetitive parts for engineering stable genetic systems",
        description: [
          "Used graph theory and state by state path generation to generate thousands of non-repetitive genetic part designs.",
          "Characterized all promoters in a massively parallel RNASeq assay normalizing RNA fold expression by genomic copy number."
        ]
      },
      {
        date: "1/2021",
        journal: "Synthetic Biology Journal",
        title: "Aquarium: open-source laboratory software for design, execution, and data management",
        description: [
          "Collaborated on development of web application which integrates experimental design, inventory management, protocol execution, and data capture.",
          "The containerized application allows scientists to scale up research, automate execution, and collaborate on biomedical and bioindustrial research."
        ]
      }
    ],
  
    education: [
      {
        degree: "Master of Science – Computer Science",
        school: "Georgia Tech University",
        location: "Atlanta, GA",
        period: "12/2024",
        details: [
          "Specialization in Computing Systems",
          "Computer Networks, Intro to Information Security, Software Arch & Design",
          "Advanced Internet Computing, Robotic AI Techniques, Machine Learning for Trading"
        ]
      },
      {
        degree: "Bachelor of Science – Biology and Minor – Philosophy",
        school: "Gonzaga University",
        location: "Spokane, WA",
        period: "5/2013"
      }
    ],
  
    socialLinks: {
      github: "https://github.com/eribertolopez",
      linkedin: "https://linkedin.com/in/eribertolopez",
      email: "mailto:EribertoLopez3@gmail.com"
    }
  };
  
  return <Resume {...resumeData} />;
};

const Content = ({ currentTheme, allPosts }: { currentTheme: Sections, allPosts: Post[] }) => {
  const heroPost = allPosts[0]
  const morePosts = allPosts.slice(1, allPosts.length).filter((post) =>  post.isPublished === true )

  return (
    <div>
      <Intro currentTheme={currentTheme}/>
      {heroPost && (
        <MyResume />
        // <HeroPost
        //   title={heroPost.title}
        //   coverImage={heroPost.coverImage}
        //   date={heroPost.date}
        //   author={heroPost.author}
        //   slug={heroPost.slug}
        //   excerpt={heroPost.excerpt}
        //   currentTheme={currentTheme}
        // />
      )}
      {morePosts.length > 0 && <MoreStories posts={morePosts} currentTheme={currentTheme} />}
    </div>
  )
}

export default function Index({ allPosts }: Props) {
  const heroPost = allPosts[0]
  const morePosts = allPosts.slice(1).filter((post) =>  post.isPublished === true )
  const [currentTheme, setCurr_entTheme] = useState<Sections>(Sections.Resume);
  // const handleThemeChange = useCallback((theme: Sections) => {
  //   setCurrentTheme(themes[theme]);
  // }, [themes])

  return (
    <SidebarLayout
      headTitle={`Latest | Eriberto Lopez`}
      currentTheme={currentTheme}
      onThemeChange={() => {}}
      contentImage={heroPost.coverImage}
    >
      <Content currentTheme={currentTheme} allPosts={allPosts}/>
    </SidebarLayout>
  )

}

export const getStaticProps = async () => {
  const allPosts = getAllResumes([
    'title',
    'date',
    'slug',
    'author',
    'coverImage',
    'excerpt',
    'isPublished',
  ])

  return {
    props: { allPosts },
  }
}


