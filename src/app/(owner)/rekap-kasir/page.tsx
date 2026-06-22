import React from 'react';
import { prisma } from '@/lib/db';
import RekapClient from './RekapClient';

export default async function AuditKasirPage() {
  const reports = await prisma.cashRegisterReport.findMany({
    include: {
      employee: true,
      shift: true
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: 100 // Limit for now
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-text-primary">Audit Rekap Kasir</h1>
        <p className="text-text-secondary">Pantau dan verifikasi setoran fisik dari kasir saat pergantian shift.</p>
      </div>

      <RekapClient initialReports={reports} />
    </div>
  );
}
