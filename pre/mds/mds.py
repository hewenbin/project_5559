#import modules
import csv
import numpy as np

from matplotlib import pyplot as plt

from sklearn import manifold
from sklearn.metrics import euclidean_distances

# load data
reader = csv.reader(open("../../public/data/halos/hlist_015.csv", "r"), delimiter=',')
x = list(reader)
del x[0]
data = np.array(x).astype('float')
data = data[:, [11, 12, 13, 16, 26]]
print(data.shape)

similarities = euclidean_distances(data)
print(similarities.shape)

mds = manifold.MDS(n_components=5, max_iter=3000, eps=1e-9,
                   dissimilarity="precomputed", n_jobs=1)
pos = mds.fit(similarities).embedding_

fig = plt.figure(1)
ax = plt.axes([0., 0., 1., 1.])
plt.scatter(pos[:, 0], pos[:, 1], s=15, c='g')
plt.show()
