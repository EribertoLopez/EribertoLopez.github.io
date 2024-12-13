import React, { useState } from 'react';
import { Github, Twitter, Linkedin, Mail, X } from 'lucide-react';
import Link from 'next/link';
import { MYEMAIL, MYGITHUB, MYLINKEDIN, MYTWITTER, Sections, themes } from '../lib/ConfigUtils';
import Head from 'next/head';
import Container from './container';
import Layout from './layout';
import styles from './Header.module.css';
import ContentArea from './ContentArea';
import resumeData from '../lib/resumeConfig';
import SidebarLayout from './SidebarLayout';
import resumeStyles from './Resume.module.css';

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




const MyResume = ({
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
    <div className={resumeStyles.resume}>
      {/* Sidebar */}
      <div className={resumeStyles.sidebar}>
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
      <div className={resumeStyles.mainContent}>
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

const Resume = () => {
  return <MyResume {...resumeData} />;
};


  
export default Resume;