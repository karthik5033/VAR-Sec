"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { API_BASE_URL } from "@/lib/constants";

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE_URL}/campaigns`)
      .then(res => res.json())
      .then(data => {
        setCampaigns(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="container mx-auto p-8 max-w-6xl mt-24">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">OSINT Threat Campaigns</h1>
        <p className="text-slate-500 mt-2">Active scam operations detected across social media and messaging platforms.</p>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 bg-slate-100 rounded-lg"></div>
          ))}
        </div>
      ) : campaigns.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent className="text-slate-500">
            No active campaigns detected at the moment.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {campaigns.map((camp: any) => (
            <Card key={camp.id} className="overflow-hidden border-l-4 border-l-rose-500 shadow-sm">
              <CardHeader className="bg-slate-50/50 border-b py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-lg text-slate-800">{camp.name}</CardTitle>
                    <Badge variant={camp.type === 'SAFE' ? 'default' : 'destructive'}>{camp.type}</Badge>
                  </div>
                  <span className="text-sm font-medium bg-white px-3 py-1 rounded-full border shadow-sm text-slate-600">
                    {camp.posts} Posts Clustered
                  </span>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div>
                  <h4 className="text-sm font-semibold text-slate-700 mb-2">Target Entities</h4>
                  <div className="flex flex-wrap gap-2">
                    {camp.summary?.split(",").map((entity: string, i: number) => (
                      entity ? <Badge key={i} variant="outline" className="bg-slate-50 text-slate-600 border-slate-200">{entity}</Badge> : null
                    ))}
                    {!camp.summary && <span className="text-sm text-slate-400">None extracted</span>}
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t text-sm text-slate-500 flex justify-between">
                  <span>Last active: {new Date(camp.last_seen).toLocaleString()}</span>
                  <button className="text-indigo-600 font-medium hover:underline">View Deep Dive &rarr;</button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
