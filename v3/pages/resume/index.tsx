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
    title: "Software Engineer",
    location: "Los Angeles Metropolitan Area",
    contact: {
      phone: "",  // Phone removed for privacy
      email: "eribertolopez3@gmail.com",
      github: "eribertolopez"
    },
    profileImage: "/assets/profile.jpg", // You'll need to provide the actual path
    summary: "At Strateos, I am currently working on engineering cloud infrastructure and applications to automate and structure scientific experiments. We enable organizations to capture their scientific intent and transform it into a deterministic machine readable schema that can be executed on the Strateos Cloud Lab Environment. We provide a centralized UI for operators and researchers to plan, execute, and analyze their experimental workflows. It empowers our users to scale the throughput of their experiment, reduce hands on time, and generate data that feed into data pipelines and data driven applications.",
    
    skills: [
      {
        category: "Top Skills",
        items: [
          "FastAPI",
          "Codegen",
          "Engineering Management"
        ]
      },
      {
        category: "Languages",
        items: [
          "Spanish (Native or Bilingual)",
          "English (Native or Bilingual)"
        ]
      },
      {
        category: "Technologies",
        items: [
          "Python(Flask, FastAPI)", 
          "JavaScript", 
          "TypeScript(NextJS, React, ReactHooks, MobX)", 
          "Java(SpringBoot, JPA, Hibernate)",
          "GraphQL",
          "REST",
          "Terraform",
          "AWS(IaaC, EKS, ECS, RDS)",
          "ArgoCD"
        ]
      }
    ],
  
    certifications: [
      "Agile at Work: Planning with Agile",
      "User Stories",
      "Cloud Developer Nanodegree Program"
    ],
  
    experience: [
      {
        title: "Sr. Software Engineer",
        company: "Strateos",
        location: "Menlo Park, California, United States",
        period: "December 2021 - Present",
        description: "Processing Experimental Workflows at Remote Laboratories",
        achievements: [
          "Scientific laboratory instrument edge device deployment & configuration",
          "Scientist centric graphical experimental workflow builder",
          "Remotely manage team in feature implementations and contribute to workflow engine distributed system",
          "Manage relationship between third party offshore development team to increase engineering resources to meet quarterly milestones",
          "Performed frontend performance analysis and generated roadmap to decrease CPU and network consumption",
          "Led initiative to streamline incident triaging processes, resulting in an increase in the engineer volunteering rate",
          "Use Jira and Slack APIs and automation to improve developer velocity and accountability"
        ]
      },
      {
        title: "Software Engineer III",
        company: "Strateos",
        location: "Menlo Park, California",
        period: "August 2019 - December 2021",
        description: "Development and maintenance of scientific automation platform",
        achievements: [
          "Interfaced with scientific clients to plan and manage automated experimental executions on cloud controlled devices",
          "Track record of meeting client experimental needs and building robust, automated data pipelines",
          "Established a mammalian flow cytometry data generation pipeline with automated gaussian distribution gating analysis",
          "Implemented automated COVID-19 testing protocol for cloud controlled devices"
        ]
      },
      {
        title: "Research Scientist/Engineer II",
        company: "Department of Electrical & Computer Engineering - University of Washington",
        location: "Greater Seattle Area",
        period: "July 2017 - August 2019",
        description: "Part of the UW BIOFAB team in the Klavins Lab",
        achievements: [
          "Investigating Boolean logic synthetic gene circuits in Yeast & E. coli",
          "Developing RNA Sequencing pipeline and automated assays",
          "Automating high throughput assays through laboratory management software",
          "Using relational database to associate and save scientific measurements",
          "Teaching and mentoring undergraduate research assistants"
        ]
      }
    ],
  
    publications: [
      {
        date: "2020",
        journal: "Nature Biotechnology",
        title: "Automated design of thousands of nonrepetitive parts for engineering stable genetic systems",
        description: [
          "Used graph theory and state by state path generation for genetic part designs",
          "Characterized promoters in parallel RNASeq assay normalizing RNA fold expression"
        ]
      },
      {
        date: "2021",
        journal: "Synthetic Biology Journal",
        title: "Aquarium: open-source laboratory software for design, execution and data management",
        description: [
          "Web application for experimental design, inventory management, and data capture",
          "Containerized application for scaling biomedical and bioindustrial research"
        ]
      }
    ],
  
    education: [
      {
        degree: "Cloud Developer Nanodegree Program",
        school: "Udacity",
        location: "",
        period: ""
      },
      {
        degree: "Bachelor of Science (B.Sc.) Biology",
        school: "Gonzaga University",
        location: "Spokane, Washington",
        period: "2013",
        details: ["Biochemistry and Cellular Biology"]
      }
    ],
  
    socialLinks: {
      github: "",  // You'll need to provide the actual URLs
      linkedin: "https://www.linkedin.com/in/eribertolopez",
      email: "mailto:eribertolopez3@gmail.com"
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


