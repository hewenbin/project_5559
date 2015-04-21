# import modules
from sdfpy import load_sdf
from thingking import loadtxt
import numpy

# convert to csv
prefix = "../../_raw_data/"

str_header = 'scale, id, desc_scale, desc_id, num_prog, pid, upid, desc_pid, phantom, \
    sam_mvir, mvir, rvir, rs, vrms, mmp, scale_of_last_MM, vmax, x, y, z, \
    vx, vy, vz, Jx, Jy, Jz, Spin, Breadth_first_ID, Depth_first_ID, \
    Tree_root_ID, Orig_halo_ID, Snap_num, Next_coprogenitor_depthfirst_ID, \
    Last_progenitor_depthfirst_ID, Rs_Klypin, M_all, M200b, M200c, M500c, \
    M2500c, Xoff, Voff, Spin_Bullock, b_to_a, c_to_a, A_x, A_y, A_z, \
    b_to_a_500c, c_to_a_500c, A_x_500c, A_y_500c, A_z_500c, T_over_U, \
    M_pe_Behroozi, M_pe_Diemer, Macc, Mpeak, Vacc, Vpeak, Halfmass_Scale, \
    Acc_Rate_Inst, Acc_Rate_100Myr, Acc_Rate_Tdyn'.replace(' ', '')

for i in range(12, 101):
    fname = prefix + "rockstar/hlists/hlist_%.05f.list"%(i/100.)
    print(fname)
    data = loadtxt(fname, unpack=True)
    numpy.savetxt("hlist_%03d.csv"%(i), data.transpose(), delimiter=",", header=str_header, fmt='%.7g')
print('done')
