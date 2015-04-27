from sdfpy import load_sdf
from thingking import loadtxt
import numpy as np

prefix = "../../_raw_data/"

pmin = 0.
pmax = 0.

for f in range(2, 100):
  particles = load_sdf(prefix + "ds14_scivis_0128_e4_dt04_0." + format(f, '02') + "00")

  h_100 = particles.parameters['h_100']
  width = particles.parameters['L0']
  cosmo_a = particles.parameters['a']
  kpc_to_Mpc = 1. / 1000

  pn = len(particles['x'])

  # Define a simple function to convert proper to comoving Mpc/h.
  convert_to_cMpc = lambda proper: (proper + width/2. * cosmo_a) * h_100 * kpc_to_Mpc / cosmo_a

  f = open("particles_" + format(f, '03') +".csv", "w")
  f.write("x,y,z,p\n")
  # for i in range(0, pn):
  for i in np.random.choice(2097152, 10000, replace = False):
    string = str(convert_to_cMpc(particles['x'][i]))+","+str(convert_to_cMpc(particles['y'][i]))+","+str(convert_to_cMpc(particles['z'][i]))+","+str(particles['phi'][i])+"\n"
    f.write(string)
    if pmin > particles['phi'][i]:
      pmin = particles['phi'][i]
    if pmax < particles['phi'][i]:
      pmax = particles['phi'][i]
  f.close()

print(pmin)
print(pmax)
