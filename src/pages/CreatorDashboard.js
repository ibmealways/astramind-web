import React, { useState } from "react";

export default function CreatorDashboard(){

  const [stats] = useState({

    videos: 12,
    images: 8,
    scripts: 20,
    audio: 4,
    books: 2

  });

  const [recentProjects] = useState([

    {
      name:"TikTok AI Channel",
      type:"Video",
      date:"Today"
    },

    {
      name:"Motivation Script Pack",
      type:"Script",
      date:"Yesterday"
    },

    {
      name:"Ebook: AI Business Guide",
      type:"Book",
      date:"2 days ago"
    }

  ]);

  return(

    <div className="creator-dashboard">

      <h1>🎬 Creator OS Dashboard</h1>

      <div className="dashboard-grid">

        <div className="stat-card">
          <h3>Videos Generated</h3>
          <p>{stats.videos}</p>
        </div>

        <div className="stat-card">
          <h3>Images Generated</h3>
          <p>{stats.images}</p>
        </div>

        <div className="stat-card">
          <h3>Scripts Created</h3>
          <p>{stats.scripts}</p>
        </div>

        <div className="stat-card">
          <h3>Audio Tracks</h3>
          <p>{stats.audio}</p>
        </div>

        <div className="stat-card">
          <h3>Books Created</h3>
          <p>{stats.books}</p>
        </div>

      </div>


      <div className="recent-projects">

        <h2>Recent Projects</h2>

        {recentProjects.map((project,i)=>(

          <div key={i} className="project-card">

            <h4>{project.name}</h4>

            <span>{project.type}</span>

            <small>{project.date}</small>

          </div>

        ))}

      </div>

    </div>

  )

}