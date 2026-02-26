---
title: 'Cover Letter - TetraScience'
sourceType: 'cover_letter'
date: '2025-01-26'
author:
  name: 'Eriberto Lopez'
---

To the TetraScience Hiring Manager:

I am writing to express my interest in the Software Engineer III \- Data Applications position at TetraScience\. With significant experience developing scientific software applications at both Strateos and the University of Washington, I am excited about contributing to TetraScience’s mission to accelerate scientific discovery and improve and extend human life\.\.

At Strateos, I develop cloud\-based distributed systems that manage remote laboratory operations, translating complex scientific requirements into standardized instruction schemas\. This work involves building scalable applications that help researchers execute concurrent workflows while maintaining precise data provenance\. During my time at the University of Washington's Klavins Lab, I developed a workflow engine application for a DARPA\-funded project that automated laboratory processes\. This experience strengthened my expertise in building interactive applications and translating complex user needs into practical solutions\.

What draws me to TetraScience is your mission to improve lives by harmonizing diverse scientific data sources to generate actionable insights and accelerate scientific discovery\. My background in developing software that bridges scientific intent and practical execution aligns closely with TetraScience’s goal of building a platform that helps researchers identify key insights from their experimental data\. Through close collaboration with both technical software teams and scientific stakeholders, I have learned to communicate across disciplines and turn complex, ambiguous goals into flexible, actionable plans that deliver real\-world value\.

I look forward to discussing how my technical expertise can contribute to TetraScience’s innovative platform and mission\.

Best,

Eriberto Lopez

Summary  
Software engineer with experience building cloud\-based scientific applications that bridge scientific intent and practical execution\. I have worked at the intersection of software engineering and experimental science, developing scalable systems that support complex workflows, maintain data provenance, and generate actionable insights\. I thrive in cross\-disciplinary environments, translating ambiguous scientific goals into flexible, executable solutions that deliver real\-world impact\.  
  
  
Mission

The Tetra Scientific Data and AI Platform is the only open, cloud\-native platform purpose\-built for science that connects lab instruments, informatics software, and data apps across the biopharma value chain and delivers the foundation of harmonized, actionable scientific data necessary to transform raw data into accelerated and improved scientific outcomes\.

If so, describe your connection to science or scientific data\.

I obtained my BS in Biology in 2013 and began to work in a biotechnology company genetically engineering cyanobacteria\. From there I worked at the University of Washington investigating and designing CRISPR systems\. In that experience, I automated an RNA Sequencing workflow that I integrated into a cloud based web application\. I then used the application and workflow to generate publications in both the Synthetic Biology Journal and the Nature Biotechnology Journal\. More recently, I worked at a laboratory automation company called Strateos\. Strateos automated and harmonized scientific experiments and data through cloud controlled devices\. Users could design their experiments through our web application and the robotic distributed backend would schedule and execute it\. The could then download their data, which contained rich metadata and data provenance\.  
  


If so, what do you use Python for? How many years have you spent building Production\-grade code with code review, QA, sign\-offs, and release? What is your go\-to stack to build and deploy an application in Python?

I have used python for about 10 years ranging from analyzing scientific experimental data with pandas to creating microservices with FastAPI\. I am a main contributor and maintainer of open\-source library autoprotocol\-python \([https://github\.com/autoprotocol/autoprotocol\-python](https://github.com/autoprotocol/autoprotocol-python)\)\. Autoprotocol is a language for specifying experimental protocols for scientific research in a way that is precise, unambiguous, and understandable by both humans and computers\. It was developed as a way to define experiments that could be run over the internet on remote robotic automation, with the aim of moving research into the cloud\. In terms of deploying python applications my go\-to stack, if I’m deploying a microservice, is currently is using pydantic for my DTOs and FastAPI for my server framework\. For deployment, I like to use ArgoCD to watch for changes to the github repo and automatically have EKS \(AWS kubernetes\) deploy and run the new image\.

Briefly describe your past work with science data and large data systems \(databases, ETL, SQL\)

At the University of Washington, I built an RNA\-seq data processing workflow that supported large\-scale scientific datasets and enabled researchers across institutions to plan and execute informatics experiments\. I designed and implemented an ETL pipeline that ingested raw sequencing data from Illumina instruments, transformed it by mapping Illumina barcodes to sequencing reads, and loaded curated results into a centralized database\.

Each experiment generated approximately 5–10GB of data, which could be difficult to interpret without bioinformatics expertise\. By structuring the data and exposing it through the database, the system allowed researchers to query, understand, and download experiment\-specific results \(e\.g\. by well or experimental condition\) without needing to build their own computational environment\. This work emphasized scalable data processing, data provenance, and accessibility for non\-technical users\.

Have you led an engineering team with 4 or more members including you?

\*If so, briefly describe the team, your role and the impact you made\.

I led a cross\-functional software team of five engineers, along with a third\-party development team, responsible for the workflows domain of a scientific automation platform\.

In this role, I owned technical direction and delivery of a workflow builder product that enabled scientists to visually design experiments by dragging and dropping scientific operations onto a UI canvas\. My team was responsible for building new backend microservices, the frontend application, and deploying the required cloud infrastructure, while ensuring seamless integration with other distributed platform components such as LIMS and robotic execution systems\.

The impact was the successful delivery of a core platform capability that simplified complex scientific workflows, improved usability for end users, and enabled faster adoption of automation across the broader system\.

Do you use AI in your daily work? If so, briefly describe your usage and experience with it\.

I use AI daily as part of my engineering and planning workflow\. I primarily use it to understand existing codebases and system architectures more quickly by providing relevant portions of the code as context and exploring architectural tradeoffs before planning and implementation\.

I also use AI to help break down features into concrete implementation plans and to identify where changes are likely required across a distributed system\. While it is effective at accelerating discovery and outlining approaches, I treat its output as a starting point rather than a final solution\.

I review and refine the proposed changes directly in the codebase, cleaning up patterns, validating data models, and applying first principles of software design to ensure the final implementation is correct, maintainable, and does not introduce unnecessary complexity\. 

Have you led professional services or technical delivery projects?

If so, describe the teams and projects in question, and your role in them\.  


I have led a mix of professional services and technical delivery projects\.

At Strateos, I worked on client\-facing engagements with biotechnology and pharmaceutical companies, where I partnered directly with customers to define project scope, align on expectations, and translate their scientific workflows into technical requirements\. This included demonstrating platform capabilities, identifying gaps, and discussing potential workarounds or new features needed to support customer\-specific workflows\.

Following discovery, I coordinated closely with engineering teams to scope the required work, define technical approaches, and establish delivery timelines using agile practices\. My role bridged customers and engineering, ensuring projects were well\-scoped, technically feasible, and delivered in alignment with customer needs\.
