import React from 'react';
import { IAMExtendedData } from '../types';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Shield, Users, UserX, Key, UserCheck, AlertTriangle, Building } from 'lucide-react';
import ExpandableSection from './ExpandableSection';

const IAMDashboard: React.FC<{ data: IAMExtendedData }> = ({ data }) => {
  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

  const roleData = [
    { name: 'Owners', value: data.privilegedRoleSummary?.owners || 0 },
    { name: 'Contributors', value: data.privilegedRoleSummary?.contributors || 0 },
    { name: 'Global Admins', value: data.privilegedRoleSummary?.globalAdmins || 0 },
  ];

  const totalAssignments = data.roleAssignments?.length || 0;
  const userCount = data.roleAssignments?.filter(r => r.principalType === 'User').length || 0;
  const groupCount = data.roleAssignments?.filter(r => r.principalType === 'Group').length || 0;
  const spCount = data.roleAssignments?.filter(r => r.principalType === 'ServicePrincipal').length || 0;

  const principalTypeData = [
    { name: 'Users', value: userCount },
    { name: 'Groups', value: groupCount },
    { name: 'Service Principals', value: spCount },
    { name: 'Unknown', value: totalAssignments - userCount - groupCount - spCount },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6">
      {/* KPI Hero */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-8 rounded-2xl text-white shadow-xl">
        <h2 className="text-2xl font-bold mb-6">Identity & Access Management</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-blue-400">{totalAssignments}</div>
            <div className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Role Assignments</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-red-400">{data.privilegedRoleSummary?.owners || 0}</div>
            <div className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Owners</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-400">{data.servicePrincipals?.length || 0}</div>
            <div className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Service Principals</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-orange-400">{data.guestUsers || 0}</div>
            <div className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Guest Users</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-yellow-400">{data.staleAccounts || 0}</div>
            <div className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Stale Accounts</div>
          </div>
        </div>
      </div>

      {/* Role Assignments Table */}
      <ExpandableSection title="Role Assignments" icon={<Shield className="w-5 h-5" />} badge={totalAssignments} defaultOpen={true}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="max-h-[350px] overflow-y-auto custom-scrollbar">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-2 text-xs text-slate-500 font-bold uppercase">Principal</th>
                    <th className="text-left py-2 text-xs text-slate-500 font-bold uppercase">Type</th>
                    <th className="text-left py-2 text-xs text-slate-500 font-bold uppercase">Role</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.roleAssignments || []).map((item) => (
                    <tr key={item.id} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="py-2 font-medium text-slate-800">{item.principalName || item.principalId}</td>
                      <td className="py-2">
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                          item.principalType === 'User' ? 'bg-blue-50 text-blue-600' :
                          item.principalType === 'Group' ? 'bg-green-50 text-green-600' :
                          item.principalType === 'ServicePrincipal' ? 'bg-purple-50 text-purple-600' :
                          'bg-slate-100 text-slate-500'
                        }`}>
                          {item.principalType}
                        </span>
                      </td>
                      <td className="py-2 text-slate-600">{item.roleName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="h-[250px]">
            <h4 className="text-sm font-bold text-slate-700 mb-2 text-center">By Principal Type</h4>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={principalTypeData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2} dataKey="value">
                  {principalTypeData.map((_, idx) => (<Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </ExpandableSection>

      {/* Privileged Role Summary */}
      <ExpandableSection title="Privileged Role Summary" icon={<Key className="w-5 h-5" />} badge={`${roleData.reduce((s, r) => s + r.value, 0)} privileged`} badgeColor="bg-red-100 text-red-700">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {roleData.map((role, idx) => (
            <div key={idx} className="bg-slate-50 p-5 rounded-xl text-center border border-slate-100">
              <div className="text-3xl font-bold text-slate-900">{role.value}</div>
              <div className="text-sm text-slate-500 mt-1">{role.name}</div>
              {role.value > 3 && (
                <div className="flex items-center justify-center gap-1 mt-3 text-xs text-orange-600 bg-orange-50 py-1 px-2 rounded-lg">
                  <AlertTriangle className="w-3 h-3" />
                  <span>Consider reducing</span>
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="mt-4 bg-amber-50 p-3 rounded-xl text-sm text-amber-800 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span><strong>Best Practice:</strong> Minimize Owner and Global Admin assignments. Use JIT (Just-in-Time) access via PIM where possible.</span>
        </div>
      </ExpandableSection>

      {/* Service Principal Audit */}
      <ExpandableSection title="Service Principal Audit" icon={<Building className="w-5 h-5" />} badge={data.servicePrincipals?.length || 0}>
        {(data.servicePrincipals || []).length === 0 ? (
          <div className="text-center py-6 text-slate-400">No service principal data available.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 text-xs text-slate-500 font-bold uppercase">Name</th>
                  <th className="text-left py-2 text-xs text-slate-500 font-bold uppercase">Role</th>
                  <th className="text-left py-2 text-xs text-slate-500 font-bold uppercase">Credential Expiry</th>
                </tr>
              </thead>
              <tbody>
                {data.servicePrincipals.map((sp, idx) => {
                  const expDate = new Date(sp.credentialExpiry);
                  const now = new Date();
                  const daysToExpiry = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                  const isExpiring = daysToExpiry <= 30 && daysToExpiry > 0;
                  const isExpired = daysToExpiry <= 0;
                  return (
                    <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="py-2 font-medium text-slate-800">{sp.name}</td>
                      <td className="py-2 text-slate-600">{sp.roleName}</td>
                      <td className="py-2">
                        <span className={`text-xs font-bold px-2 py-1 rounded ${isExpired ? 'bg-red-100 text-red-700' : isExpiring ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                          {isExpired ? 'EXPIRED' : isExpiring ? `${daysToExpiry}d left` : sp.credentialExpiry}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </ExpandableSection>

      {/* Guest & Stale Accounts */}
      <ExpandableSection title="Guest & Stale Accounts" icon={<UserX className="w-5 h-5" />} badgeColor="bg-orange-100 text-orange-700" badge={`${(data.guestUsers || 0) + (data.staleAccounts || 0)} flagged`}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-orange-50 p-5 rounded-xl">
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-5 h-5 text-orange-600" />
              <h4 className="font-bold text-slate-900">External Guest Users</h4>
            </div>
            <div className="text-3xl font-bold text-orange-600 mt-2">{data.guestUsers || 0}</div>
            <p className="text-sm text-slate-500 mt-2">External identities with access to this subscription. Review periodically.</p>
          </div>
          <div className="bg-red-50 p-5 rounded-xl">
            <div className="flex items-center gap-3 mb-2">
              <UserCheck className="w-5 h-5 text-red-600" />
              <h4 className="font-bold text-slate-900">Stale Accounts</h4>
            </div>
            <div className="text-3xl font-bold text-red-600 mt-2">{data.staleAccounts || 0}</div>
            <p className="text-sm text-slate-500 mt-2">Accounts with no sign-in activity in 90+ days. Consider removal.</p>
          </div>
        </div>
      </ExpandableSection>
    </div>
  );
};

export default IAMDashboard;
